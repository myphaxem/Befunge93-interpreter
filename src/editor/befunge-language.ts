import * as monaco from 'monaco-editor';

export function registerBefungeLanguage() {
  const id = 'befunge';
  if ((monaco.languages as any).getLanguages().some(l => l.id === id)) return id;

  monaco.languages.register({ id });
  monaco.languages.setMonarchTokensProvider(id, {
    tokenizer: {
      root: [
        [/\d+/, 'number'],
        [/[><^v_|\+\-\*\/\%\\\$\:\!\`\#\?\&\~\,\.\"gp@]/, 'keyword'],
        [/./, '']
      ]
    }
  } as any);
  monaco.languages.setLanguageConfiguration(id, {
    comments: { lineComment: ';' },
    brackets: [ ['"', '"'] ]
  });
  return id;
}