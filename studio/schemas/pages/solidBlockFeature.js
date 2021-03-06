import React from 'react'

export default {
  title: "Solid Block Feature",
  name: "solidBlockFeature",
  type: "object",
  localize: true,
  fields: [
    {
      title: "Title",
      name: "title",
      type: "string",
      description: "The title of this block",
      validation: (Rule) => Rule.required(),
    },
    {
      title: "Text",
      name: "text",
      description: "The text of this block",
      type: 'array', 
      of: [{type: 'block'}],
    },
    {
      title: "Image",
      name: "image",
      type: "image",
      localize: false,
      description: "The image to be used for this block",
      options: {
        crop: true,
        hotspot: true
      }
    },
    //TODO: reference to article, product, or campaign
    {
      title: "Text Orientation",
      name: "orientation",
      type: "string",
      localize: false,
      description: "The orientation of the text on the block (e.g, should text appear to the left or right of the image?",
      options: {
        list: ["left", "right"],
      },
    },
    {
      title: "Text Color",
      name: "textColor",
      type: "color",
      localize: false,
      description: "The color that text should appear in",
    },
    {
      title: "Block Color",
      name: "blockColor",
      type: "color",
      localize: false,
      description: "The background color of the block",
    },
  ]
}

