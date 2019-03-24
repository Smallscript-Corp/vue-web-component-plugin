const VueWCPlugIn = {
  deferred: {},
  $isEnabled: true,
  get isEnabled() {
    return VueWCPlugIn.$isEnabled;
  },
  set isEnabled(value) {
    if(VueWCPlugIn.$isEnabled = value) {
      Object.keys(VueWCPlugIn.deferred).forEach(key => {
        window.customElements.define(key, VueWCPlugIn.deferred[key]);
      });
    }
    return true;
  },
  install(Vue, args) {
    if(args && 'isEnabled' in args) this.isEnabled = args.isEnabled;
    // Here is where we SHOULD patch Vue.component, etc
    const $component = this.$component = Vue.component;
    Vue.component = function(id, definition) {
      if(definition && 'shadowCss' in definition /* ok to be inherited, can be fn/promise */) {
        class CustomWebComponent extends WebComponent {};
        CustomWebComponent.vueDefinition = definition;
        definition.customElementTag = id;
        if(!VueWCPlugIn.isEnabled) {
          Vue.config.ignoredElements.push(id);
          VueWCPlugIn.deferred[id] = CustomWebComponent;
        }
        else
          window.customElements.define(id, CustomWebComponent);
        return definition;
      }
      return($component.apply(this, arguments));
    }
    
    const $isDOMSlotAttr = Vue.$isDOMSlotAttr;
    const camelizeRE = /-(\w)/g;
    const camelize = str => {
      return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
    };
    const hyphenateRE = /\B([A-Z])/g;
    const hyphenate = str => {
      return str.replace(hyphenateRE, '-$1').toLowerCase()
    };

    function getInitialProps (propsList) {
      const res = {};
      propsList.forEach(key => {
        res[key] = undefined;
      });
      return res
    }

    function injectHook (options, key, hook) {
      options[key] = [].concat(options[key] || []);
      options[key].unshift(hook);
    }

    function callHooks (vm, hook) {
      if (vm) {
        const hooks = vm.$options[hook] || [];
        hooks.forEach(hook => {
          hook.call(vm);
        });
      }
    }

    function createCustomEvent (name, args) {
      return new CustomEvent(name, {
        bubbles: false,
        cancelable: false,
        detail: args
      })
    }

    const isBoolean = val => /function Boolean/.test(String(val));
    const isNumber = val => /function Number/.test(String(val));
    function convertAttributeValue (value, name, { type } = {}) {
      if (isBoolean(type)) {
        if (value === 'true' || value === 'false') {
          return value === 'true'
        }
        if (value === '' || value === name) {
          return true
        }
        return value != null
      } else if (isNumber(type)) {
        const parsed = parseFloat(value, 10);
        return isNaN(parsed) ? value : parsed
      } else {
        return value
      }
    }

    function getAttributes (node) {
      const res = {};
      for (let i = 0, l = node.attributes.length; i < l; i++) {
        const attr = node.attributes[i];
        res[attr.nodeName] = attr.nodeValue;
      }
      return res
    }

    function toVNode (h, node) {
      if (node.nodeType === 3) {
        return node.data.trim() ? node.data : null
      } else if (node.nodeType === 1) {
        const data = {
          attrs: getAttributes(node),
          domProps: {
            innerHTML: node.innerHTML
          }
        };
        if (data.attrs.slot) {
          if(false) {
            data.slot = data.attrs.slot;
            delete data.attrs.slot;
          }
        }
      } else {
        return null
      }
    }

    function toVNodes (h, children) {
      const res = [];
      for (let i = 0, l = children.length; i < l; i++) {
        res.push(toVNode(h, children[i]));
      }
      return res
    }

    function markSlotElementsForTreatmentAsNativeDOM(node) {
      if(node.tagName === 'SLOT') {
        if(!node.hasAttribute($isDOMSlotAttr))
          node.setAttribute($isDOMSlotAttr,'');
      }
      for(var cel = node.firstElementChild; cel; cel = cel.nextElementSibling)
        markSlotElementsForTreatmentAsNativeDOM(cel);
    }

    class WebComponent extends HTMLElement {
      get vueDefinition() {
        // vueDefinition: could obtain from this.tagName registry 
        // and not need `extends: WebComponent`.
        return this.constructor.vueDefinition;
      }
      constructor () {
        super();
        this.$wcs = { // in case we ever want it "closed"
          shadowRoot: this.attachShadow({mode:'open'}), 
        };
        console.log(`S:constructor[${this.tagName}]: ${VueWCPlugIn.isEnabled}`);
      }
      
      static get observedAttributes() {
        // This whitelist should jive with definition's props
        // https://developers.google.com/web/fundamentals/web-components/customelements
        return this.vueDefinition.observedAttributes; 
      }
      attributeChangedCallback(name, oldValue, newValue) {
        // We actually need to propagate these DOWN to the vue
        const vue = this.$wcs.vue;
        if(vue) {
          const camelized = camelize(key);
          const vueDefinition = this.vueDefinition;
          const value = this.hasAttribute(key) ? this.getAttribute(key) : undefined;
          vue.props[camelized] = convertAttributeValue(
            value,
            key,
            vueDefinition.camelizedPropsMap[camelized]
          );
        }
      }
      
      $initializeVueDefinition(vueDefinition) {
        this.constructor.isVueDefinitionLoaded = true;
        const options = typeof vueDefinition === 'function'
          ? vueDefinition.options
          : vueDefinition;
        
        // extract props info
        const propsList = Array.isArray(options.props)
          ? options.props
          : Object.keys(options.props || {});
        let hyphenatedPropsList = vueDefinition.hyphenatedPropsList = propsList.map(hyphenate);
        let camelizedPropsList = vueDefinition.camelizedPropsList = propsList.map(camelize);
        const originalPropsAsObject = Array.isArray(options.props) ? {} : options.props || {};
        let camelizedPropsMap = vueDefinition.camelizedPropsMap 
          = camelizedPropsList.reduce((map, key, i) => {
          map[key] = originalPropsAsObject[propsList[i]];
          return map
        }, {});

        // proxy $emit to native DOM events
        injectHook(options, 'beforeCreate', function () {
          const emit = this.$emit;
          this.$emit = (name, ...args) => {
            this.$root.$options.customElement.dispatchEvent(createCustomEvent(name, args));
            return emit.call(this, name, ...args)
          };
        });

        injectHook(options, 'created', function () {
          // sync default props values to wrapper on created
          camelizedPropsList.forEach(key => {
            this.$root.props[key] = this[key];
          });
        });

        // proxy props as Element properties
        const prototype = this.constructor.prototype;
        camelizedPropsList.forEach(key => {
          Object.defineProperty(prototype, key, {
            get () {
              const vue = this.$wcs.vue;
              return vue ? vue.props[key] : undefined;
            },
            set (newVal) {
              const vue = this.$wcs.vue;
              if(vue) vue.props[key] = newVal;
            },
            enumerable: false,
            configurable: true
          });
        });
      }
      
      get isVueDefinitionLoaded() {
        if(!this.constructor.isVueDefinitionLoaded) {
          // Lazy load as needed on connectedCallback
          const vueDefinition = this.vueDefinition;
          const isAsync = typeof vueDefinition === 'function' && !vueDefinition.cid;
          if(isAsync) {
            vueDefinition().then(resolved => {
              if (resolved.__esModule || resolved[Symbol.toStringTag] === 'Module')
                this.constructor.vueDefinition = resolved.default;
              // Signal connected, unless we are disconnected at this point
              this.connectedCallback();
            });
            return false;
          }
          this.$initializeVueDefinition(vueDefinition);
        }
        return true;
      }
      
      $initializeVueInstance() {
        // We are ONLY called when the definition has been loaded
        const vueDefinition = this.constructor.vueDefinition;
        this.$wcs.isVueInitialized = true;
        
        // Create "vue" the logical shadowRoot (but has NO $el) $mount root
        // which expects to find the "ref:inner" shadowRoot childElement
        // This is done, because shadowRoot can't be cloned for Vue to wrapper it
        // so we make the "$wcs.vue" root private and manually control its lifecycle.
        const vue = this.$wcs.vue = new Vue({
          name: 'shadow-root',
          customElement: this,
          shadowRoot: this.$wcs.shadowRoot,   // in case we ever want it "closed"
          shadowVueDefinition: vueDefinition,
          data () {
            return {
              props: {},
              name: 'shadow',
              slotChildren: []
            }
          },
          // template: vueDefinition.template,
          render (h) {
            // Any changes to component template are a problem
            // that must be trapped; or rather; we need to patch
            // the "template" with data-wcs on all slots before
            // proceeding to next phase. So here is the "HOOK"
            // point to validate the template. If it has never
            // been analyzed, or if it has been modified, then
            // we need to place it into a documentFragment, patch 
            // its slots with data-wcs flags, and then provide
            // it to the (h) rendering function. 
            // Find all "<slot !data-wcs" and add "data-wcs". This
            // allows the template format to use Vue extensions.
            // which really means we want to use the Vue.parse
            // function to process "dirty" templates.
            const vueDefinition = this.$options.shadowVueDefinition;
            if(!vueDefinition.$fHaveShadowRootSlotsBeenFlagged) {
              const rootEl = document.createElement('div');
              rootEl.innerHTML = vueDefinition.template;
              markSlotElementsForTreatmentAsNativeDOM(rootEl);
              vueDefinition.template = (rootEl.childElementCount > 1)
                ? rootEl.outerHTML
                : rootEl.innerHTML;
              vueDefinition.$fHaveShadowRootSlotsBeenFlagged = true;
            }
            return h(vueDefinition, {
              ref: 'inner',
              // References to "vue.data()" members
              props: this.props
            }, this.slotChildren);
          },
          // beforeMounted() {
          //   console.log("S:beforeMounted");
          // },
          // mounted() {
          //   console.log("S:mounted");
          // },
          // beforeUpdate() {
          //   console.log("S:beforeUpdate");
          // },
          // update() {
          //   console.log("S:update");
          // },
          // beforeDestroy() {
          //   console.log("S:beforeDestroy");
          // },
          // destroyed() {
          //   console.log("S:destroyed");
          // },
          // activated() {
          //   console.log("S:activated");
          // },
          // deactivated() {
          //   console.log("S:deactivated");
          // },
        });    
        // initialize shadowVue props
        vue.props = getInitialProps(vueDefinition.camelizedPropsList);
        vueDefinition.hyphenatedPropsList.forEach(key => {
          this.attributeChangedCallback(key);
        });
      }
      
      get isVueInitialized() {
        if(!this.$wcs.isVueInitialized) {
          if(!this.isVueDefinitionLoaded) 
            return false;
          this.$initializeVueInstance();
        }
        return true;
      }
      
      $mountVue() {
        // Use MutationObserver to react to future attribute & slot content change
        const vue = this.$wcs.vue;
        this.$wcs.isVueMounted = true;
        //console.log("S:MIDDLE:isVueMounted", this.$wcs.isVueMounted);
        const shadowRoot = this.shadowRoot;
        const vueDefinition = this.vueDefinition;
        {
          // Mount before tracking changes
          vue.$mount(); // vue._isMounted should be true (or we can hook it)
          // Replace OR update shadowRoot content (mount/unmount doesn't change anything)
          const childElementCount = shadowRoot.childElementCount;
          if(childElementCount)
            shadowRoot.replaceChild(vue.$el, shadowRoot.firstElementChild);
          else
            shadowRoot.appendChild(vue.$el);
          if(childElementCount < 2) {
            if(typeof vueDefinition.shadowCss === 'string' && vueDefinition.shadowCss.length) {
              const shadowStyle = document.createElement('style');
              shadowStyle.type = 'text/css';
              shadowStyle.appendChild(document.createTextNode(vueDefinition.shadowCss));
              shadowRoot.appendChild(shadowStyle);
              // console.log("shadowCss", shadowStyle);
            }
          }
        }
        if(!this.$wcs.observer) {
          // if(vueDefinition.onSlotChange) {
          //   // Register the slot-change hooks on each slot, or use @slotchange on slots
          // }
          (this.$wcs.observer = new MutationObserver(mutations => {
            let hasChildrenChange = false;
            for (let i = 0; i < mutations.length; i++) {
              const m = mutations[i];
              if (m.type !== 'attributes' || m.target !== self) {
                hasChildrenChange = true;
                break;
              }
            }
            // initialize shadowVue children [probably NONE]
            if (hasChildrenChange) {
              vue.slotChildren = Object.freeze(toVNodes.call(shadowRoot,
                vue.$createElement,
                shadowRoot.childNodes
              ));
            }
          })).observe(this.shadowRoot, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
          });
        }
      }
      
      get isVueMounted() {
        if(!this.$wcs.isVueMounted) {
          if(!this.isVueInitialized) 
            return false;
          //console.log("S:BEFORE:isVueMounted", this.$wcs.isVueMounted);
          this.$mountVue();
          //console.log("S:AFTER:isVueMounted", this.$wcs.isVueMounted);
          return false;
        }
        return true;
      }

      get vueInternalRoot () {
        const vue = this.$wcs.vue;
        return vue 
          ? vue.$refs.inner
          : undefined;
      }

      connectedCallback () {
        //console.log("S:connectedCallback", VueWCPlugIn.isEnabled);
        if (this.isConnected && VueWCPlugIn.isEnabled && this.isVueMounted)
          callHooks(this.vueInternalRoot, 'activated');
      }

      disconnectedCallback () {
        const vueInternalRoot = this.vueInternalRoot;
        //console.log("S:disconnectedCallback");
        if(vueInternalRoot)
          callHooks(vueInternalRoot, 'deactivated');
      }
      
      adoptedCallback() {
        //console.log("S:adoptedCallback");
      }
    }

    // Vue needs perf-patching on custom-elements
    //  for `function isUnknownElement (tag)` because it will 
    //  create an element to test with, rather than calling customElement.get().

    // https://github.com/vuejs/vue-web-component-wrapper/issues/49
    // https://forum.vuejs.org/t/double-rendering-of-non-vue-custom-elements-in-chrome/11554/3
  },
};
// Return our "PlugIn" - options
export default (Vue.$VueWCPlugIn = VueWCPlugIn);
