import schema from 'part:@sanity/base/schema'
const blocksToHtml = require('@sanity/block-content-to-html')
import blockTools from '@sanity/block-tools'
import  { serializers } from './translationSerializers'

// import { setCORS } from "google-translate-api-browser";
// setting up cors-anywhere server address
// const translate = setCORS("http://cors-anywhere.herokuapp.com/");

const h = blocksToHtml.h

//rudimentary stopgap in case people don't filter. 
const STOP_TYPES = [
  'reference', 'date', 'datetime', 'file', 
  'geopoint', 'image', 'number', 'url',
  'crop', 'hotspot'
]

const META_FIELDS = ['_key', '_type', '_id']

const makeBaseInfo = (obj) => {
  const baseKeys = META_FIELDS.filter(field => obj[field])
  return Object.fromEntries(baseKeys.map(key => [key, obj[key]]))
}


export const getTranslatableFields = (doc, docFields) => {
  
  const fieldsToTranslate = makeBaseInfo(doc)

  const localizableFields = docFields.filter(field => (
    field.type.localize !== false && !STOP_TYPES.includes(field.type.name))
  )

  localizableFields.forEach(field => {

    if (Object.keys(serializers).includes(field.type.name) && doc[field.name]) {
      fieldsToTranslate[field.name] = serializers[field.type.name].serialize(doc[field.name])
    }

    else if (field.type.name == 'string' || field.type.name == 'text') {
      fieldsToTranslate[field.name] = doc[field.name]
    } 

    else if (Array.isArray(doc[field.name])) {
      fieldsToTranslate[field.name] = serializeField(doc[field.name], field.name)
    }

    else if (!STOP_TYPES.includes(field.type.name) && doc[field.name]) {
      //TODO: make check if user wants this to be serialized at all? -- objs can stay objs in certain cases
      //assume this is an object and can be discovered
      const serialized = serializeBlock(doc[field.name]) 
  
      fieldsToTranslate[field.name] = serialized
    }

  })
  return fieldsToTranslate
}


const getTranslatableBlocks = (block) => {
   if (block._type === 'span' || block._type === 'block') {
      return block
    } else if (STOP_TYPES.includes(block._type)) {
      return {}
    } else {
        const blockType = schema.get(block._type)
        if (blockType.localize) {
          debugger
          return getTranslatableFields(block, blockType.fields)
        } else { 
          return {}
        }
    }
}


const serializeField = (arr, topFieldName) => {
  const blocksToTranslate = arr.map(getTranslatableBlocks)
    .filter(obj => Object.keys(obj).length > 0)
  console.log(blocksToTranslate)
  const output = blocksToTranslate.map(serializeBlock)

  //TODO: human readable? add newlines?
  return `<div class="${topFieldName}">${output.join()}</div>`
    
}


const serializeBlock = (block) => {
  const serializer = {block: props => h('p', {id: props.node._key}, props.children)}

  if (block._type !== 'span' && block._type !== 'block') {
    let innerHTML = ""

    //TODO: have these fields follow the order that they're in the schema
    Object.entries(block).forEach(([fieldName, value]) => {
      let htmlField = ""

      //don't worry about metadata -- gets serialized at the end
      if (META_FIELDS.includes(fieldName)) { 
        htmlField = "" 
      }

      else if (typeof(value) === 'string') {
        //check if this has already been recursively turned into html
        const htmlRegex = /^</
        htmlField = (value.match(htmlRegex)) ? value : `<span class="${fieldName}">${value}</span>`
      } 

      innerHTML += htmlField
    })
    
    serializer[block._type] = props => {
      return h('div', {
        className: props.node._type,
        id: props.node._key ?? props.node._id, 
        innerHTML: innerHTML
        }
      )
    }
   }

  return blocksToHtml({blocks: [block], serializers: {types: serializer}})

}


const deserializeHTML = (html, target) => {
  //parent node is always div with classname of field -- get its children
  const HTMLnode = new DOMParser().parseFromString(html, 'text/html').body.children[0]
  const children = Array.from(HTMLnode.children)

  const output = (target.type.of) ? [] : {}
  children.forEach(child => {
    
    if (Object.keys(serializers).includes(child.className)) {
      output[child.className] = serializers[child.className].deserialize(child)
    }
    
    //flat string, it's an unrich field
    if (child.tagName.toLowerCase() == 'span') {
      output[child.className] = child.innerText
    } 

    //p tag, it's a block
    else if (child.tagName.toLowerCase() == 'p') {
      const defaultBlockType = schema.get('block')
      const block = blockTools.htmlToBlocks(child.outerHTML, target.type ?? defaultBlockType)[0]
      block._key = child.id
      output.push(block)
    }

    //has specific class name, it's either an embedded obj or rich field
    else if (child.className) {
      let objType;
      let embeddedObj;
      //if i'm in an array, this is specific type
      if (Array.isArray(output)) {
        objType = schema.get(child.className)
        embeddedObj = deserializeHTML(child.outerHTML, objType)
        embeddedObj._key = child.id
        embeddedObj._type = child.className
        output.push(embeddedObj)
      }
      //this is a rich object or text array as a field
      else {
        //you may have to find the type of object this is if the field is a custom type
        let objType;
        if (target.fields) {
          objType = target.fields.find(field => field.name == child.className)
        } else { 
          objType = schema.get(child.className)
        }
        embeddedObj = deserializeHTML(child.outerHTML, objType)
        embeddedObj._key = child.id
        output[child.className] = embeddedObj
      }

    }
  })
  return output
}


export const translatedDocumentToBlocks = (doc, docFields, origDraft) => {

  const finalDoc = makeBaseInfo(doc)
  const fieldsToIngest = docFields.filter(field => Object.keys(doc).includes(field.name))
  fieldsToIngest.forEach(field => {
    if (field.type.name == 'string' || field.type.name == 'text') {
      finalDoc[field.name] = doc[field.name]
    } else {
      finalDoc[field.name] = deserializeHTML(doc[field.name], field) 
    }
  })

 return finalDoc
}


export const googleTranslate = async (doc, lang) => {
  const translatedDoc = {}
  const translatedEntries = await Promise.all(
    Object.entries(doc).map(async ([fieldName, val]) => {
      //dont get rate limited!
      await new Promise(r => setTimeout(r, 1000))
      return [
        fieldName,
        await translate(val, {to: lang}).then(res => res.text)
      ]
    })
  )
  return Object.fromEntries(translatedEntries) 
}
