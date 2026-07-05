import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

const editor = new Editor({
  extensions: [
    StarterKit,
    Link.configure({
      openOnClick: false,
      protocols: ['task', 'note'],
      validate: href => true,
    })
  ],
  content: '<p>test</p>',
});

editor.chain().focus().selectAll().setLink({ href: 'note:My Note' }).run();
console.log(editor.getHTML());
editor.chain().focus().selectAll().setLink({ href: 'task:My Task' }).run();
console.log(editor.getHTML());
editor.chain().focus().selectAll().setLink({ href: 'www.example.com' }).run();
console.log(editor.getHTML());

