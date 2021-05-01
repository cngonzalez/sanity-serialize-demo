import client from 'part:@sanity/base/client'

export const serializers = {

  mainImage: {
    serialize: (obj) => {
      //it's important to encode key and class into the top level of your obj so we can patch it back correctly
      return `
        <figure class="${obj._type}" id="${obj._key}">
          <image src="TODO: construct usable image url" alt="${obj.alt}" />
          <figcaption>
            ${obj.caption}
          </figcaption>
        </figure>
      `.trim()
    },
    deserialize: (HTMLnode) => {
      const mainImageObj = {}
      mainImageObj._key = htmlNode.id
      const children = Array.from(HTMLnode.children)
      mainImageObj.alt = children.find(child => child.tagName.toLowerCase() == 'img').alt
      mainImageObj.caption = children.find(child => child.tagName.toLowerCase() == 'figCaption').innerText
      return mainImageObj
    }
  }
}
