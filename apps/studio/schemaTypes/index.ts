import {knitPattern} from './documents/knitPattern'
import {crochetPattern} from './documents/crochetPattern'
import {yarn} from './documents/yarn'
import {category} from './documents/category'
import {hook} from './documents/hook'
import {needle} from './documents/needle'
import {stitchType} from './documents/stitchType'
import {gauge} from './objects/gauge'
import {sizeOption} from './objects/sizeOption'
import {yarnRequirement} from './objects/yarnRequirement'
import {needleRequirement} from './objects/needleRequirement'
import {hookRequirement} from './objects/hookRequirement'
import {stitchCountEntry} from './objects/stitchCountEntry'
import {stitchRef} from './objects/stitchRef'
import {instructionGroup} from './objects/instructionGroup'
import {instructionStep} from './objects/instructionStep'
import {patternSection} from './objects/patternSection'

export const schemaTypes = [
  knitPattern,
  crochetPattern,
  yarn,
  category,
  hook,
  needle,
  stitchType,
  gauge,
  sizeOption,
  yarnRequirement,
  needleRequirement,
  hookRequirement,
  stitchCountEntry,
  stitchRef,
  instructionGroup,
  instructionStep,
  patternSection,
]
