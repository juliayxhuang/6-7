<script setup>
import { computed } from 'vue'
import publication from '../data/publication.json'

const props = defineProps({ text: { type: String, default: '' } })
const emit = defineEmits(['reveal'])
const entries = publication.glossary
const lookup = new Map(entries.map((item, index) => [item.term.toLocaleLowerCase(), index]))
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${entries.map(item => item.term).sort((a, b) => b.length - a.length).map(escapePattern).join('|')})(?![\\p{L}\\p{N}])|(?<![\\p{L}\\p{N}])(?:6[-–— ]?7|67)`, 'giu')
const parts = computed(() => {
  const source = props.text
  const chunks = []
  pattern.lastIndex = 0
  let cursor = 0
  for (const match of source.matchAll(pattern)) {
    const index = lookup.get(match[0].toLocaleLowerCase()) ?? lookup.get('6-7')
    if (index === undefined) continue
    if (match.index > cursor) chunks.push({ text: source.slice(cursor, match.index) })
    chunks.push({ text: match[0], index })
    cursor = match.index + match[0].length
  }
  if (cursor < source.length) chunks.push({ text: source.slice(cursor) })
  return chunks
})
</script>

<template><template v-for="(part, index) in parts" :key="index"><button v-if="part.index !== undefined" class="glossary-link" type="button" :aria-label="`${part.text} — find in glossary`" @click="emit('reveal', part.index)">{{ part.text }}</button><template v-else>{{ part.text }}</template></template></template>
