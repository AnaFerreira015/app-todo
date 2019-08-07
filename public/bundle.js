
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value) {
        node.style.setProperty(key, value);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(changed, child_ctx);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Tasks/TaskGridItem.svelte generated by Svelte v3.7.1 */

    const file = "src/Tasks/TaskGridItem.svelte";

    function create_fragment(ctx) {
    	var tr, td0, t0, t1, td1, i0, t2, td2, i1, dispose;

    	return {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(ctx.description);
    			t1 = space();
    			td1 = element("td");
    			i0 = element("i");
    			t2 = space();
    			td2 = element("td");
    			i1 = element("i");
    			add_location(td0, file, 7, 4, 174);
    			attr(i0, "class", "fas fa-edit");
    			add_location(i0, file, 9, 8, 286);
    			add_location(td1, file, 8, 4, 201);
    			attr(i1, "class", "fas fa-trash");
    			add_location(i1, file, 12, 8, 387);
    			add_location(td2, file, 11, 4, 326);
    			add_location(tr, file, 6, 0, 165);

    			dispose = [
    				listen(td1, "click", ctx.click_handler),
    				listen(td2, "click", ctx.click_handler_1)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td0);
    			append(td0, t0);
    			append(tr, t1);
    			append(tr, td1);
    			append(td1, i0);
    			append(tr, t2);
    			append(tr, td2);
    			append(td2, i1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.description) {
    				set_data(t0, ctx.description);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(tr);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { id, description } = $$props;
        const dispatch = createEventDispatcher();

    	const writable_props = ['id', 'description'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<TaskGridItem> was created with unknown prop '${key}'`);
    	});

    	function click_handler() {
    		return dispatch('edit', { id: id, description: description });
    	}

    	function click_handler_1() {
    		return dispatch('delete', { id: id });
    	}

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('description' in $$props) $$invalidate('description', description = $$props.description);
    	};

    	return {
    		id,
    		description,
    		dispatch,
    		click_handler,
    		click_handler_1
    	};
    }

    class TaskGridItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["id", "description"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<TaskGridItem> was created without expected prop 'id'");
    		}
    		if (ctx.description === undefined && !('description' in props)) {
    			console.warn("<TaskGridItem> was created without expected prop 'description'");
    		}
    	}

    	get id() {
    		throw new Error("<TaskGridItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<TaskGridItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<TaskGridItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<TaskGridItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Tasks/Task.svelte generated by Svelte v3.7.1 */

    const file$1 = "src/Tasks/Task.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.task = list[i];
    	return child_ctx;
    }

    // (174:8) {:else}
    function create_else_block(ctx) {
    	var tr, td, t0, i, t1;

    	return {
    		c: function create() {
    			tr = element("tr");
    			td = element("td");
    			t0 = text("No tasks.");
    			i = element("i");
    			t1 = space();
    			attr(i, "class", "fas fa-sad-tear");
    			add_location(i, file$1, 175, 29, 5224);
    			add_location(td, file$1, 175, 16, 5211);
    			add_location(tr, file$1, 174, 12, 5190);
    		},

    		m: function mount(target, anchor) {
    			insert(target, tr, anchor);
    			append(tr, td);
    			append(td, t0);
    			append(td, i);
    			append(tr, t1);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(tr);
    			}
    		}
    	};
    }

    // (168:8) {#each tasks as task (task.id)}
    function create_each_block(key_1, ctx) {
    	var first, current;

    	var taskgriditem = new TaskGridItem({
    		props: {
    		id: ctx.task.id,
    		description: ctx.task.description
    	},
    		$$inline: true
    	});
    	taskgriditem.$on("edit", ctx.editTask);
    	taskgriditem.$on("delete", ctx.deleteTask);

    	return {
    		key: key_1,

    		first: null,

    		c: function create() {
    			first = empty();
    			taskgriditem.$$.fragment.c();
    			this.first = first;
    		},

    		m: function mount(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(taskgriditem, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var taskgriditem_changes = {};
    			if (changed.tasks) taskgriditem_changes.id = ctx.task.id;
    			if (changed.tasks) taskgriditem_changes.description = ctx.task.description;
    			taskgriditem.$set(taskgriditem_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(taskgriditem.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(taskgriditem.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(first);
    			}

    			destroy_component(taskgriditem, detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var div8, div7, div6, div0, label, t1, div5, div1, p, input, t2, span0, i0, t3, div4, div2, button0, t5, div3, button1, span1, i1, t6, span2, button1_disabled_value, t8, div9, h4, t10, table, thead, tr, th0, t12, th1, t14, th2, t16, tbody, each_blocks = [], each_1_lookup = new Map(), current, dispose;

    	var each_value = ctx.tasks;

    	const get_key = ctx => ctx.task.id;

    	for (var i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	var each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block();
    		each_1_else.c();
    	}

    	return {
    		c: function create() {
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			label = element("label");
    			label.textContent = "Task";
    			t1 = space();
    			div5 = element("div");
    			div1 = element("div");
    			p = element("p");
    			input = element("input");
    			t2 = space();
    			span0 = element("span");
    			i0 = element("i");
    			t3 = space();
    			div4 = element("div");
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "New";
    			t5 = space();
    			div3 = element("div");
    			button1 = element("button");
    			span1 = element("span");
    			i1 = element("i");
    			t6 = space();
    			span2 = element("span");
    			span2.textContent = "Save";
    			t8 = space();
    			div9 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Tasks";
    			t10 = space();
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Task Description";
    			t12 = space();
    			th1 = element("th");
    			th1.textContent = "Edit";
    			t14 = space();
    			th2 = element("th");
    			th2.textContent = "Delete";
    			t16 = space();
    			tbody = element("tbody");

    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();
    			attr(label, "class", "label");
    			add_location(label, file$1, 117, 4, 3422);
    			attr(div0, "class", "field-label is-normal");
    			add_location(div0, file$1, 116, 3, 3382);
    			attr(input, "id", "newDescriptionId");
    			attr(input, "class", "input");
    			attr(input, "type", "text");
    			attr(input, "placeholder", "Enter new task...");
    			add_location(input, file$1, 122, 6, 3576);
    			attr(i0, "class", "fas fa-tasks");
    			add_location(i0, file$1, 124, 7, 3744);
    			attr(span0, "class", "icon is-small is-left");
    			add_location(span0, file$1, 123, 6, 3700);
    			attr(p, "class", "control is-expanded has-icons-left");
    			add_location(p, file$1, 121, 5, 3523);
    			attr(div1, "class", "field");
    			add_location(div1, file$1, 120, 4, 3498);
    			attr(button0, "class", "button is-normal");
    			add_location(button0, file$1, 131, 6, 3895);
    			attr(div2, "class", "control");
    			add_location(div2, file$1, 130, 5, 3867);
    			attr(i1, "class", "fas fa-check");
    			add_location(i1, file$1, 136, 32, 4195);
    			attr(span1, "class", "icon is-small");
    			add_location(span1, file$1, 135, 28, 4134);
    			add_location(span2, file$1, 138, 28, 4286);
    			attr(button1, "class", "button is-info");
    			button1.disabled = button1_disabled_value = !ctx.validDescription;
    			add_location(button1, file$1, 134, 24, 4023);
    			attr(div3, "class", "control");
    			add_location(div3, file$1, 133, 5, 3977);
    			attr(div4, "class", "field is-grouped");
    			add_location(div4, file$1, 129, 4, 3831);
    			attr(div5, "class", "field-body");
    			add_location(div5, file$1, 119, 3, 3469);
    			attr(div6, "class", "field is-horizontal");
    			add_location(div6, file$1, 115, 2, 3345);
    			attr(div7, "class", "notification");
    			set_style(div7, "margin-top", "2%");
    			add_location(div7, file$1, 113, 1, 3276);
    			attr(div8, "class", "container");
    			add_location(div8, file$1, 112, 0, 3251);
    			attr(h4, "class", "title is-4 svelte-1fm51ua");
    			set_style(h4, "color", "black");
    			add_location(h4, file$1, 157, 1, 4691);
    			add_location(th0, file$1, 161, 7, 4834);
    			add_location(th1, file$1, 162, 7, 4867);
    			add_location(th2, file$1, 163, 7, 4888);
    			add_location(tr, file$1, 160, 5, 4822);
    			add_location(thead, file$1, 159, 3, 4809);
    			add_location(tbody, file$1, 166, 3, 4930);
    			attr(table, "class", "table is-bordered is-striped is-hoverable");
    			add_location(table, file$1, 158, 1, 4748);
    			attr(div9, "class", "container");
    			add_location(div9, file$1, 156, 0, 4666);

    			dispose = [
    				listen(input, "input", ctx.input_input_handler),
    				listen(button0, "click", ctx.newTask),
    				listen(button1, "click", ctx.submitTask)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div8, anchor);
    			append(div8, div7);
    			append(div7, div6);
    			append(div6, div0);
    			append(div0, label);
    			append(div6, t1);
    			append(div6, div5);
    			append(div5, div1);
    			append(div1, p);
    			append(p, input);

    			input.value = ctx.newDescription;

    			append(p, t2);
    			append(p, span0);
    			append(span0, i0);
    			append(div5, t3);
    			append(div5, div4);
    			append(div4, div2);
    			append(div2, button0);
    			append(div4, t5);
    			append(div4, div3);
    			append(div3, button1);
    			append(button1, span1);
    			append(span1, i1);
    			append(button1, t6);
    			append(button1, span2);
    			insert(target, t8, anchor);
    			insert(target, div9, anchor);
    			append(div9, h4);
    			append(div9, t10);
    			append(div9, table);
    			append(table, thead);
    			append(thead, tr);
    			append(tr, th0);
    			append(tr, t12);
    			append(tr, th1);
    			append(tr, t14);
    			append(tr, th2);
    			append(table, t16);
    			append(table, tbody);

    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(tbody, null);

    			if (each_1_else) {
    				each_1_else.m(tbody, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.newDescription && (input.value !== ctx.newDescription)) input.value = ctx.newDescription;

    			if ((!current || changed.validDescription) && button1_disabled_value !== (button1_disabled_value = !ctx.validDescription)) {
    				button1.disabled = button1_disabled_value;
    			}

    			const each_value = ctx.tasks;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, tbody, outro_and_destroy_block, create_each_block, null, get_each_context);
    			check_outros();

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block();
    				each_1_else.c();
    				each_1_else.m(tbody, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			for (i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div8);
    				detach(t8);
    				detach(div9);
    			}

    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d();

    			if (each_1_else) each_1_else.d();

    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	
       let tasks = [];
       let newDescription = "";
       let id = null;
       let validDescription = false; // declaração reativa
     
        onMount(() => {
            getTasks();
        });
        function getTasks() {
            fetch("https://app-todo-b369f.firebaseio.com/tasks.json")
                .then(response => {
                    if (!response.ok) {
                        throw new error("An error occurred, please try again!");
                    }
                    return response.json();
                })
                .then(data => {
                    for (const key in data) {
                        $$invalidate('tasks', tasks = [...tasks, { id: key, description: data[key].description }]);
                        console.table(tasks);
                    }
                })
                .catch(error => console.log(error));
        }

        function newTask() {
            id = null;
            $$invalidate('newDescription', newDescription = "");
            document.getElementById("newDescriptionId").focus();
        }

        function submitTask() {
            id ? updateTask() : insertTask();
        }
     
        function insertTask() {
        const taskData = { description: newDescription };
        
        fetch("https://app-todo-b369f.firebaseio.com/tasks.json", {
            method: "POST",
            body: JSON.stringify(taskData),
            headers: { "Content-Type": "application/json" }
        })
        
            .then(response => {
                if (!response.ok) {
                    throw new error("An error occurred, please try again!");
                }
                return response.json();
            })
        
            .then(data => {
                $$invalidate('tasks', tasks = [...tasks, { id: data.name, description: newDescription }]);
                newTask();
            })
            .catch(error => console.log(error));
        }

        function updateTask() {
            const taskData = { description: newDescription };
     
            fetch(`https://app-todo-b369f.firebaseio.com/tasks/${id}.json`, {
                method: "PATCH",
                body: JSON.stringify(taskData),
                headers: { "Content-Type": "application/json" }
            })
            .then(response => {
                if (!response.ok) {
                    throw new error("An error occurred, please try again!");
                }
                const index = tasks.findIndex(task => task.id === id);
                tasks[index] = { id: id, description: newDescription }; $$invalidate('tasks', tasks);
                newTask();
            })
            .catch(error => console.log(error));
        } 

        function editTask(event) {
            id = event.detail.id;
            $$invalidate('newDescription', newDescription = event.detail.description);
        }

        function deleteTask(event) {
            id = event.detail.id;
            fetch(`https://app-todo-b369f.firebaseio.com/tasks/${id}.json`, {
                method: "DELETE"
            })
            .then(response => {
                if (!response.ok) {
                    throw new error("An error occurred, please try again!");
                }
                $$invalidate('tasks', tasks = tasks.filter(task => task.id !== event.detail.id));
                newTask();
            })
            .catch(error => console.log(error));
        }

    	function input_input_handler() {
    		newDescription = this.value;
    		$$invalidate('newDescription', newDescription);
    	}

    	$$self.$$.update = ($$dirty = { newDescription: 1 }) => {
    		if ($$dirty.newDescription) { $$invalidate('validDescription', validDescription = newDescription.trim().length >= 5); }
    	};

    	return {
    		tasks,
    		newDescription,
    		validDescription,
    		newTask,
    		submitTask,
    		editTask,
    		deleteTask,
    		input_input_handler
    	};
    }

    class Task extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* src/App.svelte generated by Svelte v3.7.1 */

    const file$2 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	var section, div, h1, t0, t1, current;

    	var tasks = new Task({ $$inline: true });

    	return {
    		c: function create() {
    			section = element("section");
    			div = element("div");
    			h1 = element("h1");
    			t0 = text(projectName);
    			t1 = space();
    			tasks.$$.fragment.c();
    			attr(h1, "class", "title");
    			set_style(h1, "color", "black");
    			set_style(h1, "text-align", "center");
    			add_location(h1, file$2, 14, 3, 431);
    			attr(div, "class", "container");
    			add_location(div, file$2, 7, 1, 197);
    			attr(section, "class", "section");
    			add_location(section, file$2, 6, 0, 170);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, section, anchor);
    			append(section, div);
    			append(div, h1);
    			append(h1, t0);
    			append(section, t1);
    			mount_component(tasks, section, null);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(tasks.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(tasks.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(section);
    			}

    			destroy_component(tasks);
    		}
    	};
    }

    const projectName = "To Do App";

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
