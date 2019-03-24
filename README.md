# vue-web-component-plugin
Use existing **Vue** `VueComponent` `vueDefinitions` as native DOM `WebComponents` supporting **shadow DOM** _semantics_ for native `slot` _elements_ and _(open or closed)_ `shadowRoot` _fragments_ including **css** _encapsulation scoping_.

See `examples/`.

You will need both files in the `src/` directory. The changes to *vue.js*
are minor and in three places. For details on what and why, read [this
posting](https://github.com/vuejs/vue-web-component-wrapper/issues/49).

**My sincere hope** is that the **Vue** _team_ incorporates the _required_ native `slot` fix; or some equivalent, back into the **Vue** `vue.js` _core_ code _(details are described in [posting](https://github.com/vuejs/vue-web-component-wrapper/issues/49) above, and can be seen in `vue.js` in this repos `src/` directory)_. If you agree that this feature-update is important, please voice your opinion to the **Vue** _team_.
