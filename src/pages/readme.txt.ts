import content from '../../public/readme.txt?raw';

export const GET = () => new Response(content, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
