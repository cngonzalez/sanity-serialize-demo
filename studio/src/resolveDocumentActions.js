// import the default document actions
import defaultResolve from 'part:@sanity/base/document-actions'
import {SendForTranslation} from './actions/sendForTranslation'
import schema from 'part:@sanity/base/schema'
import { TransifexAdapter } from './transifexAdapter'

export default function resolveDocumentActions(props) {
  const schemaDef = schema.get(props.type)
  const actions = [
    (!!schemaDef.localize ? SendForTranslation : null),
    ...defaultResolve(props),
  ].filter(Boolean)

  return actions
}
