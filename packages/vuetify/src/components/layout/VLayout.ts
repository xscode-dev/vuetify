import { defineComponent, h, inject, provide, computed, ref, onBeforeUnmount } from 'vue'
import type { InjectionKey, Ref, Prop } from 'vue'

type Position = 'top' | 'left' | 'right' | 'bottom'

interface LayoutProvide {
  register: (id: string, position: Ref<Position>, amount: Ref<number>) => Ref<Record<string, unknown>>
  unregister: (id: string) => void
  padding: Ref<string>
}

export const VuetifyLayoutKey: InjectionKey<LayoutProvide> = Symbol.for('vuetify-layout')

export function useLayout (id: string, amount: Ref<number>, position: Ref<Position>) {
  const layout = inject(VuetifyLayoutKey)

  if (!layout) throw new Error('No layout!')

  const styles = layout.register(id, position, amount)

  onBeforeUnmount(() => layout.unregister(id))

  return styles
}

const generateLayers = (
  layout: string[],
  registered: string[],
  positions: Map<string, Ref<Position>>,
  amounts: Map<string, Ref<number>>
) => {
  let previousLayer = { top: 0, left: 0, right: 0, bottom: 0 }
  const layers = [{ id: '', layer: { ...previousLayer } }]
  const ids = !layout.length ? registered : layout.map(l => l.split(':')[0]).filter(l => registered.includes(l))
  for (const id of ids) {
    const position = positions.get(id)
    const amount = amounts.get(id)
    if (!position || !amount) continue

    const layer = {
      ...previousLayer,
      [position.value]: previousLayer[position.value] + amount.value,
    }

    layers.push({
      id,
      layer,
    })

    previousLayer = layer
  }

  return layers
}
export function createLayout (layout: Ref<string[]>, overlaps: Ref<string[]>) {
  const registered = ref<string[]>([])
  const positions = new Map<string, Ref<Position>>()
  const amounts = new Map<string, Ref<number>>()

  const computedOverlaps = computed(() => {
    const map = new Map<string, { position: Position, amount: number }>()
    for (const overlap of overlaps.value.filter(item => item.includes(':'))) {
      const [top, bottom] = overlap.split(':')
      if (!registered.value.includes(top) || !registered.value.includes(bottom)) continue

      const topPosition = positions.get(top)
      const bottomPosition = positions.get(bottom)
      const topAmount = amounts.get(top)
      const bottomAmount = amounts.get(bottom)

      if (!topPosition || !bottomPosition || !topAmount || !bottomAmount) continue

      map.set(bottom, { position: topPosition.value, amount: topAmount.value })
      map.set(top, { position: bottomPosition.value, amount: -bottomAmount.value })
    }

    return map
  })

  const layers = computed(() => {
    return generateLayers(layout.value, registered.value, positions, amounts)
  })

  const padding = computed(() => {
    const layer = layers.value[layers.value.length - 1].layer
    return `${layer.top}px ${layer.right}px ${layer.bottom}px ${layer.left}px`
  })

  provide(VuetifyLayoutKey, {
    register: (id: string, position: Ref<Position>, amount: Ref<number>) => {
      positions.set(id, position)
      amounts.set(id, amount)
      registered.value.push(id)

      return computed(() => {
        const index = layers.value.findIndex(l => l.id === id)

        if (index < 0) throw new Error(`Item ${id} is missing from layout prop`)

        const item = layers.value[index - 1]

        const overlap = computedOverlaps.value.get(id)
        if (overlap) {
          item.layer[overlap.position] += overlap.amount
        }

        const isHorizontal = position.value === 'left' || position.value === 'right'
        const isOpposite = position.value === 'right'

        const amount = amounts.get(id)

        return {
          width: !isHorizontal ? `calc(100% - ${item.layer.left}px - ${item.layer.right}px)` : `${amount?.value ?? 0}px`,
          height: isHorizontal ? `calc(100% - ${item.layer.top}px - ${item.layer.bottom}px)` : `${amount?.value ?? 0}px`,
          marginLeft: isOpposite ? undefined : `${item.layer.left}px`,
          marginRight: isOpposite ? `${item.layer.right}px` : undefined,
          marginTop: position.value !== 'bottom' ? `${item.layer.top}px` : undefined,
          marginBottom: position.value !== 'top' ? `${item.layer.bottom}px` : undefined,
          [position.value]: 0,
          zIndex: layers.value.length - index,
        }
      })
    },
    unregister: (id: string) => {
      positions.delete(id)
      amounts.delete(id)
      registered.value = registered.value.filter(v => v !== id)
    },
    padding,
  })
}

export function VLayout () {
  defineComponent({
    name: 'VLayout',
    props: {
      layout: {
        type: Array,
        default: () => ([]),
      } as Prop<string[]>,
      overlaps: {
        type: Array,
      } as Prop<string[]>,
      fullHeight: Boolean,
    },
    setup (props, { slots }) {
      const layout = computed(() => props.layout ?? [])
      const overlaps = computed(() => props.overlaps ?? [])
      createLayout(layout, overlaps)

      return () => h('div', {
        style: {
          position: 'relative',
          display: 'flex',
          flex: '1 1 auto',
          height: props.fullHeight ? '100vh' : undefined,
          overflow: 'hidden',
          zIndex: 0,
        },
      }, slots.default?.())
    },
  })
}
