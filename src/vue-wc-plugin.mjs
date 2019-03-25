/* 
  Copyright Smallscript, and David Simmons (c) 2019
  
  MIT License: https://github.com/Smallscript-Corp/vue-web-component-plugin
*/
export default 
class WebComponent extends HTMLElement {
  static get isEnabled() { return this.$isEnabled; }
  static set isEnabled(value) {
    if(this.$isEnabled = value) {
      Object.keys(this.deferred).forEach(
        key => { this.deferred[key].register(); });
    }
    return true;
  }
  static shim_component(Vue) {
    const $this = this;
    const $component = this.$component = Vue.component;
    Vue.component = function(tagName, vueDefinition) {
      if(vueDefinition && 'shadowCss' in vueDefinition) {
        class CustomWebComponent extends $this { };
        CustomWebComponent.vueTagName = tagName;
        CustomWebComponent.vueDefinition = vueDefinition;
        if(!$this.isEnabled) {
          this.config.ignoredElements.push(tagName);
          $this.deferred[tagName] = CustomWebComponent;
        }
        else
          CustomWebComponent.register();
        return vueDefinition;
      }
      return($component.apply(this, arguments));
    }
  }
  static install(Vue, args) {
    // `install` is effectively our static constructor
    this.$plugin = this; this.deferred = {}; this.$args = args;
    this.isEnabled = (args && 'isEnabled' in args) ? args.isEnabled : true;
    this.Vue = Vue; this.$isDOMSlotAttr = Vue.$isDOMSlotAttr;
    this.shim_component(Vue);
  }
  static markSlotElementsForTreatmentAsNativeDOM(node) {
    if(node.tagName === 'SLOT' && !node.hasAttribute(this.$isDOMSlotAttr))
      node.setAttribute(this.$isDOMSlotAttr,'');
    for(var cel = node.firstElementChild; cel; cel = cel.nextElementSibling)
      this.markSlotElementsForTreatmentAsNativeDOM(cel);
  }
  static register() {
    // Fixup the vueDefinition as needed; saving original, then manipulating it
    const vueDefinition = this.vueDefinition;
    const rootEl = document.createElement('div');
    rootEl.innerHTML = this.vueDefinition.$template = vueDefinition.template;
    this.markSlotElementsForTreatmentAsNativeDOM(rootEl);
    vueDefinition.template = (rootEl.childElementCount > 1)
      ? rootEl.outerHTML
      : rootEl.innerHTML;
    window.customElements.define(this.vueTagName, this);
  }
  
  constructor () {
    super();
    this.$wcs = { // record shadowRoot; which allows "closed" to work
      shadowRoot: this.attachShadow({mode:'open'}), 
      $wc: this,
    };
    const vueDefinition = this.vueDefinition;
    if(typeof vueDefinition.shadowCss === 'string' && vueDefinition.shadowCss.length) {
      const shadowStyle = document.createElement('style');
      shadowStyle.type = 'text/css';
      shadowStyle.appendChild(document.createTextNode(vueDefinition.shadowCss));
      this.$wcs.shadowRoot.appendChild(shadowStyle);
    }
    this.$wcs.shadowRoot.appendChild(document.createElement('div'));
  }
  get vueDefinition() { return this.constructor.vueDefinition; }
  getParentVueOf(el) {
    if(!el)
      return undefined;
    else if(el.__vue__) 
      return el.__vue__;
    else if(el.constructor === ShadowRoot)
      return this.getParentVueOf(el.host);
    else
      return this.getParentVueOf(el.parentNode);
  }
  connectedCallback() {
    if(!this.isConnected || this.$wcs.vue) return;
    let el = this.$wcs.shadowRoot.firstElementChild;
    if(el.nextElementSibling) el = el.nextElementSibling;
    const $this = this; const parent = this.getParentVueOf(this);
    const vueDefinition = this.vueDefinition; // _super|_proto__
    const data = this.$wcs.data = (typeof vueDefinition.data === 'function') 
      ? vueDefinition.data() : vueDefinition.data /* wrong pattern */;
    // vue.connect: create singleton $options instance from defn
    this.$wcs.vue = new Vue(this.$wcs.vueDefinition = {
      __proto__: vueDefinition, // super: (ess)
      el: el,
      $wc: $this,
      data: data,
      parent: parent,
    });
  }
  disconnectedCallback() {
    // Remove from this.$wcs.vue.parent
    // vue.disconnect
  }
  adoptedCallback() {
    // Reattach to new parent: this.$wcs.vue.parent
    // vue.reparent
  }
};
