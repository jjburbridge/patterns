import {useMemo} from 'react'
import {Select} from '@sanity/ui'
import {set, unset, useFormValue} from 'sanity'
import type {StringInputProps} from 'sanity'

type SizeItem = {label?: string; _key?: string}

export function SizeSelect(props: StringInputProps) {
  const sizes = useFormValue(['sizes']) as SizeItem[] | undefined
  const labels = useMemo(
    () => (sizes ?? []).map((s) => s?.label).filter((s): s is string => Boolean(s)),
    [sizes],
  )

  return (
    <Select
      value={props.value ?? ''}
      onChange={(event) => {
        const next = event.currentTarget.value
        props.onChange(next ? set(next) : unset())
      }}
      disabled={props.readOnly}
    >
      <option value="">Select size…</option>
      {labels.map((label) => (
        <option key={label} value={label}>
          {label}
        </option>
      ))}
    </Select>
  )
}
