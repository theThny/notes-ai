import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const HiddenTimestampExtension = Extension.create({
  name: 'hiddenTimestamp',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hiddenTimestamp'),
        state: {
          init(_, { doc }) {
            const decorations = [];
            doc.descendants((node, pos) => {
              if (node.isText) {
                const regex = /\[\d{2}:\d{2}\]/g;
                let match;
                while ((match = regex.exec(node.text)) !== null) {
                  decorations.push(
                    Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                      style: 'display: none; opacity: 0; font-size: 0; position: absolute;',
                      class: 'hidden-timestamp'
                    })
                  );
                }
              }
            });
            return DecorationSet.create(doc, decorations);
          },
          apply(tr, oldState) {
            // Se o documento não mudou, não recria as decorações (otimização)
            if (!tr.docChanged) {
              return oldState.map(tr.mapping, tr.doc);
            }
            
            const doc = tr.doc;
            const decorations = [];
            doc.descendants((node, pos) => {
              if (node.isText) {
                const regex = /\[\d{2}:\d{2}\]/g;
                let match;
                while ((match = regex.exec(node.text)) !== null) {
                  decorations.push(
                    Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                      style: 'display: none; opacity: 0; font-size: 0; position: absolute;',
                      class: 'hidden-timestamp'
                    })
                  );
                }
              }
            });
            return DecorationSet.create(doc, decorations);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  }
});
