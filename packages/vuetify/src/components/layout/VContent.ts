import { randomHexColor } from '../../util/helpers'
import { defineComponent, h, inject } from 'vue'
import { VuetifyLayoutKey } from './VLayout'

export const VContent = defineComponent({
  name: 'VContent',
  setup (_, { slots }) {
    const layout = inject(VuetifyLayoutKey)
    if (!layout) throw new Error('Foo!')

    const background = randomHexColor()

    return () => h('div', {
      style: {
        padding: layout.padding.value,
        display: 'flex',
        flex: '1 0 auto',
        width: '100%',
        background,
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
      },
    }, slots.default?.())
  },
})
