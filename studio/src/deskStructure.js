import S from '@sanity/desk-tool/structure-builder'
import { i18n } from '../schemas/documentTranslation'
import { MdEdit,
         MdRemoveRedEye,
         MdStayPrimaryPortrait,
         MdTune,
         MdFormatAlignLeft,
         MdPerson,
         MdShoppingCart,
         MdTrendingUp,
         MdSettings
} from "react-icons/md"
import * as Structure from 'sanity-plugin-intl-input/lib/structure';

export const getDefaultDocumentNode = (props) => {
  if (props.schemaType === 'article'
    || props.schemaType === 'campaign') {
    return S.document().views(Structure.getDocumentNodeViewsForSchemaType(props.schemaType));
  }
  return S.document();
};

export default () => 
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Articles')
        .id('article')
        .schemaType('article')
        .child(
          S.documentList()
           .id('article')
           .title('Articles')
           .filter('_type == "article" && (!defined(_lang) || _lang == $baseLang)')
           .params({ baseLang: i18n.base })
           .canHandleIntent((_name, params, _context) => {
             // Assume we can handle all intents (actions) regarding post documents
             return params.type === 'article'
           })
        ),
      S.listItem()
        .title('Campaigns')
        .id('campaign')
        .schemaType('campaign')
        .child(
          S.documentList()
           .id('campaign')
           .title('Campaigns')
           .filter('_type == "campaign" && (!defined(_lang) || _lang == $baseLang)')
           .params({ baseLang: i18n.base })
           .canHandleIntent((_name, params, _context) => {
             // Assume we can handle all intents (actions) regarding post documents
             return params.type === 'campaign'
           })
        ),
    ])
