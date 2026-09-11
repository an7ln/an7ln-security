import content from '../../public/README.txt?raw';

export const GET = () => new Response(content, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
