import { api } from './api.js';

async function search() {
  try {
    const res = await api.external.okjatt.search('Welcome to the Jungle');
    console.log('OKJatt Search Results:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}

search();
