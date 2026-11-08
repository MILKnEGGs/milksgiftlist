<script lang="ts">
  // Small stroke icons, drawn inline so they work offline and follow the text color.
  const PATHS = {
    gift: 'M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9ZM3 7h18v4H3ZM12 7v14M12 7c-1.5-3-5.5-4-6-1.5S9.5 7 12 7Zm0 0c1.5-3 5.5-4 6-1.5S14.5 7 12 7Z',
    bag: 'M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 8Zm4 0V6a3 3 0 0 1 6 0v2',
    settings:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
    share: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    plus: 'M12 5v14M5 12h14',
    back: 'M15 5l-7 7 7 7',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    pencil: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
    x: 'M6 6l12 12M18 6 6 18',
    copy: 'M9 9h11v12H9ZM5 15H4V3h11v1',
    paste: 'M9 3h6v3H9ZM7 4.5H5V21h14V4.5h-2M9 12h6M9 16h4',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z',
    send: 'M4 12 20 4l-4 16-4-7-8-1Zm8 1 8-9',
    people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M16 3.3a4 4 0 0 1 0 7.4M18.5 14.5A7 7 0 0 1 22 21',
  } as const;

  let { name, size = 22, stroke = 2, fill = false }: { name: keyof typeof PATHS; size?: number; stroke?: number; fill?: boolean } = $props();
  // Dots need a heavier stroke to read as dots.
  const dots = $derived(name === 'more');
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={fill ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width={dots ? 3.2 : stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"><path d={PATHS[name]} /></svg>
