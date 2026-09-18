import {Badge, Button, Card, Flex, Label, Stack, Text} from '@sanity/ui'
import type {ChartController} from '../hooks/useChartController'

export function PatternContextCard({chart}: {chart: ChartController}) {
  const {selectedPattern, selectedSectionKey, applySection, clearPattern} = chart
  if (!selectedPattern) return null

  return (
    <Card padding={3} radius={2} tone="primary">
      <Stack space={3}>
        <Flex align="center" justify="space-between" gap={2} wrap="wrap">
          <Flex align="center" gap={2} wrap="wrap" style={{flex: 1}}>
            {selectedPattern.isDraft && <Badge tone="caution">Draft</Badge>}
            <Text size={1}>
              Charting{' '}
              <Text as="span" weight="semibold">
                {selectedPattern.title}
              </Text>
              {selectedPattern.type === 'knitPattern' ? ' (knit)' : ''}
              {selectedPattern.isDraft ? ' from its unpublished content' : ''}. Pick a section
              — one worked in rows opens as a grid, one worked in the round opens as a ring
              chart.
            </Text>
          </Flex>
          <Button mode="bleed" text="Back to freehand" onClick={clearPattern} />
        </Flex>

        {selectedPattern.sections.length === 0 ? (
          <Text size={1} muted>
            No structured sections on this pattern — you&rsquo;re editing a single chart
            sized to the pattern body.
          </Text>
        ) : (
          <Stack space={2}>
            <Label size={0} muted>
              Sections
            </Label>
            <Flex gap={2} wrap="wrap">
              {selectedPattern.sections.map((section) => {
                const active = section.key === selectedSectionKey
                const stepNoun = section.construction === 'rounds' ? 'rnds' : 'rows'
                const dims =
                  section.maxSts > 0 && section.rounds > 0
                    ? `${section.maxSts} sts × ${section.rounds} ${stepNoun}`
                    : 'no charted steps'
                return (
                  <Button
                    key={section.key}
                    mode={active ? 'default' : 'bleed'}
                    tone={active ? 'primary' : 'default'}
                    onClick={() => applySection(section.key)}
                    text={`${section.title} · ${dims}`}
                  />
                )
              })}
            </Flex>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
