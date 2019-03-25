# vue-web-component-plugin
Seamlessly use `Vue.component(tagName, vueDefinition)` _(or any other registration/loading mechanism)_ with existing **Vue** `VueComponent` `vueDefinitions` to have them become native DOM `WebComponents` supporting **shadow DOM** _semantics_ for native `slot` _elements_ and _(open or closed)_ `shadowRoot` _fragments_ including **css** _encapsulation scoping_.

See [`examples/`](https://github.com/Smallscript-Corp/vue-web-component-plugin/blob/master/examples/example1.html).

You will need both files in the [`src/`](https://github.com/Smallscript-Corp/vue-web-component-plugin/tree/master/src) directory. The changes to *vue.js*
are minor and in three places. For details on what and why, read [this
posting](https://github.com/vuejs/vue-web-component-wrapper/issues/49); and this `forum.vuejs.org` [**Show & Tell** _announcement_](https://forum.vuejs.org/t/plugin-for-using-your-vuecomponents-as-native-dom-webcomponents/59716).

**My sincere hope** is that the **Vue** _team_ incorporates the _required_ native `slot` fix; or some equivalent, back into the **Vue** `vue.js` _core_ code _(details are described in [posting](https://github.com/vuejs/vue-web-component-wrapper/issues/49) above, and can be seen in `vue.js` in this repos `src/` directory)_. If you agree that this feature-update is important, please voice your opinion to the **Vue** _team_.

>**NOTE**: For the [`examples/`](https://github.com/Smallscript-Corp/vue-web-component-plugin/tree/master/examples) to _run-properly_ you need to either use the _modified_ [`vue.js`](https://github.com/Smallscript-Corp/vue-web-component-plugin/blob/master/src/vue.js) version contained in this repos [`src/`](https://github.com/Smallscript-Corp/vue-web-component-plugin/tree/master/src) directory, or _build-your-own_ version, that contains the _equivalent_ modifications _described_ in [this
posting](https://github.com/vuejs/vue-web-component-wrapper/issues/49).
