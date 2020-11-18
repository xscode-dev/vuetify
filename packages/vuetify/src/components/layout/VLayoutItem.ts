import { toRef, defineComponent, h, computed } from 'vue'
import { randomHexColor } from '../../util/helpers'
import { useLayout } from './VLayout'
import type { Prop } from 'vue'

export const VLayoutItem = defineComponent({
  name: 'VLayoutItem',
  props: {
    size: {
      type: Number,
      default: 300,
    },
    position: {
      type: String,
      required: true,
    } as Prop<'top' | 'left' | 'right' | 'bottom'>,
    id: {
      type: String,
      required: true,
    },
  },
  setup (props, { slots }) {
    const styles = useLayout(props.id, toRef(props, 'size'), computed(() => props.position ?? 'left'))
    const background = randomHexColor()

    return () => h('div', {
      style: {
        background,
        position: 'absolute',
        transition: 'all 0.3s ease-in-out',
        ...styles.value,
      },
    }, slots.default?.())
  },
})
