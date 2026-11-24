/* dc-lite: tiny runtime that renders the portfolio pages without the design canvas.
   Bindings written by the exporter:
     data-on="click:handler;input:handler"  events -> current renderVals()[handler]
     data-ref="setX"                         ref callback, called once with the element
     data-if="flag"                          shown when renderVals()[flag] is truthy
     data-t="name"                           text content from renderVals()[name]
     data-b-<attr>="template {{name}}"       attribute rebuilt from renderVals() */
(function () {
  function lookup(v, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, v);
  }
  function fill(tpl, v) {
    return tpl.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, function (_, p) {
      var x = lookup(v, p);
      return x == null ? '' : String(x);
    });
  }

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    if (p) for (var k in p) this.state[k] = p[k];
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__schedule) this.__schedule(); };
  window.DCLogic = DCLogic;

  window.DCMount = function (Component) {
    var comp = new Component({});
    var vals = {};
    var queued = false;

    function render() {
      queued = false;
      vals = comp.renderVals() || {};
      document.querySelectorAll('[data-if]').forEach(function (el) {
        el.classList.toggle('dc-off', !lookup(vals, el.getAttribute('data-if')));
      });
      document.querySelectorAll('[data-t]').forEach(function (el) {
        var x = lookup(vals, el.getAttribute('data-t'));
        var s = x == null ? '' : String(x);
        if (el.textContent !== s) el.textContent = s;
      });
      document.querySelectorAll('[data-bound]').forEach(function (el) {
        Array.prototype.forEach.call(el.attributes, function (a) {
          if (a.name.indexOf('data-b-') !== 0) return;
          var name = a.name.slice(7), val = fill(a.value, vals);
          if (name === 'value' && 'value' in el) { if (el.value !== val) el.value = val; return; }
          if (el.getAttribute(name) !== val) el.setAttribute(name, val);
        });
      });
    }
    comp.__schedule = function () {
      if (!queued) { queued = true; requestAnimationFrame(render); }
    };

    render();
    document.querySelectorAll('[data-ref]').forEach(function (el) {
      var fn = lookup(vals, el.getAttribute('data-ref'));
      if (typeof fn === 'function') fn(el);
    });
    document.querySelectorAll('[data-on]').forEach(function (el) {
      el.getAttribute('data-on').split(';').forEach(function (pair) {
        if (!pair) return;
        var ev = pair.split(':')[0], name = pair.split(':')[1];
        el.addEventListener(ev, function (e) {
          var fn = lookup(vals, name);
          if (typeof fn === 'function') fn(e);
        });
      });
    });
    if (comp.componentDidMount) comp.componentDidMount();
    window.addEventListener('pagehide', function () {
      if (comp.componentWillUnmount) comp.componentWillUnmount();
    });
  };
})();
