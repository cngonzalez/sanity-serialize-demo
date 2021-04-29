import schema from 'part:@sanity/base/schema'
const blocksToHtml = require('@sanity/block-content-to-html')
import blockTools from '@sanity/block-tools'
import { setCORS } from "google-translate-api-browser";
// setting up cors-anywhere server address
const translate = setCORS("http://cors-anywhere.herokuapp.com/");

const h = blocksToHtml.h

//TODO: check external serialization doc and override wherever needed

//rudimentary helpers in case people don't filter. 
const STOP_TYPES = [
  'reference', 'date', 'datetime', 'file', 
    'geopoint', 'image', 'number', 'url'
]

const canTranslate = field => field.type.localize !== false

const makeBaseInfo = obj => ({
    _key: obj._key,
    _type: obj._type,
    _id: obj._id
})

export const getTranslatableFields = (doc, docFields) => {
  
  //TODO: extend logic for field-level translation
  const fieldsToTranslate = makeBaseInfo(doc)
  const localizableFields = docFields.filter(canTranslate)

  localizableFields.forEach(field => {

    if (field.type.name == 'string' || field.type.name == 'text') {
      fieldsToTranslate[field.name] = doc[field.name]
    } 

    else if (Array.isArray(doc[field.name])) {
      fieldsToTranslate[field.name] = serializeField(doc[field.name], field.name)
    }

    else {
      //check it's not a STOP_TYPE
      //fields[fieldName] = getTranslatableFields(object.fields)
    }

  })
  return fieldsToTranslate
}


const getTranslatableBlocks = (block) => {
   if (block._type === 'span' || block._type === 'block') {
      return block
    } else if (STOP_TYPES.indexOf(block._type) >= 0) {
      return {}
    } else {
        const blockType = schema.get(block._type)
        if (!!blockType.localize) {
          return getTranslatableFields(block, blockType.fields)
        } else { 
          return {}
        }
    }
}


const serializeField = (arr, topFieldName) => {
  const blocksToTranslate = arr.map(getTranslatableBlocks)
  const output = []

  blocksToTranslate.forEach(block => {
    const serializer = {block: props => h('p', {id: props.node._key}, props.children)}

    if (block._type !== 'span' && block._type !== 'block') {
      let innerHTML = ""

      //TODO: have these fields follow the order that they're in the schema
      Object.entries(block).forEach(([fieldName, value]) => {
        let htmlField = ""

        if (fieldName == '_key' || fieldName == '_type') { 
          htmlField = "" 
        }

        else if (typeof(value) === 'string') {
          //check if this has already been recursively turned into html
          //TODO: do this in regex
          htmlField = (value[0] == '<') ? value : `<span class="${fieldName}">${value}</span>`
        } else {
          htmlField = ""
          //TODO: think i need to recurse one more time here -- this would be an obj
          //innerHTML.push(blocksToHTML({ blocks: value }))
        }
        innerHTML += htmlField
      })
      
      serializer[block._type] = props => {
        return h('div', {className: props.node._type, id: props.node._key, innerHTML: innerHTML})
      }
     }

    let res = blocksToHtml({blocks: [block], serializers: {types: serializer}})
    output.push(res)

  })

  //TODO: human readable? add newlines?
  return `<div class=${topFieldName}>${output.join()}</div>`
    
}


const deserializeHTML = (html, target) => {
  //parent node is always div with classname of field -- get its children
  const HTMLnode = new DOMParser().parseFromString(html, 'text/html').body.children[0]
  const children = Array.from(HTMLnode.children)

  const output = (!!target.type.of) ? [] : {}
  children.forEach(child => {
    
    //TODO: check custom deserialize rules for className
    
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
    else if (!!child.className) {
      let objType;
      let embeddedObj;
      //if i'm in an array, this is specific type
      if (Array.isArray(output)) {
        objType = schema.get(child.className)
        embeddedObj = deserializeHTML(child.outerHTML, objType)
        embeddedObj._key = child.id
        output.push(embeddedObj)
      }
      //this is a rich text array as a field
      else {
        objType = target.fields.find(field => field.name == child.className)
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
  const fieldsToIngest = docFields.filter(field => Object.keys(doc).indexOf(field.name) >= 0)
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
      return {
        key: fieldName,
        value: await translate(val, {to: lang}).then(res => res.text)
      }
    })
  )
  return Object.fromEntries(translatedEntries) 
}
