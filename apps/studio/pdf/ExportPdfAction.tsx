/**
 * "Export PDF" in the document action menu, for both pattern types.
 *
 * Export runs against the draft, so what prints is what the author is looking
 * at. A pattern usually reaches its useful state long before anyone publishes
 * it, and being unable to print a work in progress would make the feature
 * useless exactly when it is most wanted.
 */

import {useCallback, useEffect} from 'react'
import {Box, Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {CheckmarkCircleIcon, DocumentPdfIcon, WarningOutlineIcon} from '@sanity/icons'
import type {DocumentActionComponent, DocumentActionProps} from 'sanity'
import {useExportPdf, type ExportPhase} from './useExportPdf'

export const PATTERN_TYPES = ['crochetPattern', 'knitPattern']

/**
 * Named in PascalCase because the Studio invokes document actions as React
 * components — it calls hooks inside them, which is only legal under that
 * convention and is what lets the export state live here.
 */
export const ExportPdfAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const {id, draft, published, onComplete} = props
  const {phase, error, filename, chartCount, run, reset} = useExportPdf()

  const close = useCallback(() => {
    reset()
    onComplete()
  }, [reset, onComplete])

  // Nothing to print before the document exists at all.
  const empty = !draft && !published

  return {
    label: 'Export PDF',
    icon: DocumentPdfIcon,
    disabled: empty,
    title: empty ? 'Add some content before exporting' : 'Download this pattern as a PDF',
    onHandle: () => {
      void run(id)
    },
    dialog:
      phase === 'idle'
        ? false
        : {
            type: 'dialog',
            header: 'Export PDF',
            // Closing mid-export abandons it; `useExportPdf` drops the run
            // rather than letting it reopen this dialog when it finishes.
            onClose: close,
            content: (
              <ExportStatus
                phase={phase}
                error={error}
                filename={filename}
                chartCount={chartCount}
                onClose={close}
              />
            ),
          },
  }
}

const BUSY_MESSAGES: Record<string, string> = {
  loading: 'Reading the pattern…',
  charts: 'Drawing the charts…',
  rendering: 'Laying out the pages…',
}

function ExportStatus({
  phase,
  error,
  filename,
  chartCount,
  onClose,
}: {
  phase: ExportPhase
  error: string | null
  filename: string | null
  chartCount: number
  onClose: () => void
}) {
  // A finished export has already handed the file over, so the dialog has
  // nothing left to do but get out of the way.
  useEffect(() => {
    if (phase !== 'done') return
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [phase, onClose])

  if (phase === 'error') {
    return (
      <Card padding={4} radius={2} tone="critical">
        <Flex align="flex-start" gap={3}>
          <Text size={2}>
            <WarningOutlineIcon />
          </Text>
          <Stack space={3}>
            <Text weight="medium">The PDF could not be created</Text>
            <Text size={1}>{error}</Text>
            <Box>
              <Button text="Close" mode="ghost" onClick={onClose} />
            </Box>
          </Stack>
        </Flex>
      </Card>
    )
  }

  if (phase === 'done') {
    return (
      <Card padding={4} radius={2} tone="positive">
        <Flex align="flex-start" gap={3}>
          <Text size={2}>
            <CheckmarkCircleIcon />
          </Text>
          <Stack space={3}>
            <Text weight="medium">Downloaded {filename}</Text>
            <Text size={1} muted>
              {chartCount > 0
                ? `Includes ${chartCount} section chart${chartCount === 1 ? '' : 's'}.`
                : 'No sections had enough stitch counts to chart.'}
            </Text>
          </Stack>
        </Flex>
      </Card>
    )
  }

  return (
    <Box padding={4}>
      <Flex align="center" gap={3}>
        <Spinner muted />
        <Text muted>{BUSY_MESSAGES[phase] ?? 'Working…'}</Text>
      </Flex>
    </Box>
  )
}
