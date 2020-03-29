class Planner {
    constructor(containerId) {
        this.base = document.getElementById(containerId);
        if (this.base == null) {
            console.log("Base container " + containerId + " does not exists");
        }
        this.units = {}
        this.vars = {}
        this.inputs = {}
        this.outputs = {}
    }
    createForm(id) {
        var form = document.createElement("form");
        form.id = id;
        var label = document.createElement("label");
        label.for = "test_field";
        label.innerHTML = "My Label (type)";
        var input = document.createElement("input");
        input.type = "text";
        input.name = input.id = "test_input";
        var base = this.getBaseContainer();
        form.appendChild(label);
        form.appendChild(input);
        base.appendChild(form);
    }
    validName(name) {
        return !name.startsWith('_');
    }
    addUnit(u) {
        if (!this.validName(u.name)) {
            console.log('Invalid name for a unit: ' + u.name);
            return null;
        }
        if (this.units[u.name] !== undefined) {
            console.log('Unit redeclared: ' + u.name);
            return null;
        }
        this.units[u.name] = u;
    }

    addInput(name, typeName) {
        if (this.vars[name] !== undefined) {
            console.log('Var ' + name + ' already defined.');
            return null;
        }
        let unit = this.units[typeName];
        if (unit === undefined) {
            console.log('No such unit:' + typeName + ' for input:' + name);
            return null;
        }
        let v = unit.makeVar(name);
        if (v == null) {
            console.log('makeVar failed?!');
        }
        this.vars[name] = this.inputs[name] = v;
        return v;
    }
    value(name) {
        let v = this.vars[name];
        if (v === undefined) {
            console.log('Getting value of undefined variable:' + name);
            return null;
        }
        return {
            dep: name,
            v: v,
            get: function() {
                return v.get();
            }
        }
    }
    onChange(id) {
        console.log('onChange ' + id);
        let txt = document.getElementById(id);
        let newValue = parseFloat(txt.value);
        let v = this.inputs[id];
        v.set(newValue);
        let deps = this.input_updates[id];
        for (let i=0; i<deps.length; i++) {
            let name = deps[i];
            let out = this.outputs[name];
            let field = document.getElementById(name);
            if (field == null) {
                // internal outputs
                continue;
            }
            console.log('onChange ' + id + ' out:' + name + ' value:' + out.display());
            field.setAttribute('value', out.display());
        }
    }
    addOutput(name, typeName, displayDecorator, ops) {
        if (this.vars[name] !== undefined) {
            console.log('Output ' + name + ' already defined.');
            return null;
        }
        let unit = this.units[typeName];
        if (unit === undefined) {
            console.log('No such unit:' + typeName + ' for output:' + name);
            return null;
        }
        let v = new Var(name, unit);
        v.ops = ops;
        v.get = function() {
            let v = ops.get();
            console.log("output " + name + ": " + v);
            return v;
        }
        v.set = undefined;
        v.display = function() {
            return displayDecorator(this.get());
        }
        this.vars[name] = this.outputs[name] = v;
        return ops;
    }
    _getDeps(obj) {
        if (obj == null) return [];
        if (obj.dep !== undefined) {
            return [obj.dep];
        }
        let deps = [];
        for (let i = 0; i < obj.arg.length; i++) {
            deps = deps.concat(this._getDeps(obj.arg[i]));
        }
        return deps;
    }
    computeDeps() {
        // key:output -> [input|output *]
        // The direct dependencies used to calculate an output
        let deps = {};
        for (const key in this.outputs) {
            const v = this.outputs[key];
            deps[key] = this._getDeps(v.ops);
        }
        // key:input -> [outputs*]
        // The outputs that depend directly on an input
        let updates = {};
        for (const key in deps) {
            const list = deps[key];
            console.log("Deps for: " + key + " = " + list);
            for (let vi = 0; vi < list.length; vi++) {
                const v = list[vi];
                console.log(" - " + key + ":" + vi + " = " + v);
                if (updates[v] === undefined) {
                    updates[v] = [key];
                } else {
                    updates[v].push(key);
                }
            }
        };
        for (const key in updates) {
            console.log('initial updates for key:' + key + ' = ' + updates[key]);
        }
        this.input_updates = {};
        for (const key in updates) {
            if (this.inputs[key] === undefined) continue;
            this.input_updates[key] = this._topoSort(updates[key], updates, deps);
            console.log('updates for key:' + key + ' = ' + this.input_updates[key]);
        }
    }
    _topoSort(list, updates, deps) {
        console.log('toposort ' + list);
        let outputs = {};
        for (let i=0; i<list.length; i++) {
            let out = list[i];
            if (outputs[out] !== undefined) continue;
            outputs[out] = [];
            if (updates[out] !== undefined) {
                outputs[out] = updates[out];
                list = list.concat(updates[out]);
            }
        }
        let cardinality = {};
        for (let key in outputs) {
            if (cardinality[key] === undefined) {
                cardinality[key] = 0;
            }
            let updates = outputs[key];
            for (let i=0; i<updates.length; i++) {
                let u = updates[i];
                if (cardinality[u] === undefined) {
                    cardinality[u] = 1;
                } else {
                    cardinality[u] ++;
                }
            }
        }
        for (let key in cardinality) {
            console.log(" - cardinality " + key + " = " + cardinality[key] + " updates " + outputs[key]);
        }
        let asList = [];
        let n = Object.keys(cardinality).length;
        while (asList.length < n) {
            let changed = 0;
            for (let key in cardinality) {
                let c = cardinality[key];
                if (c !== 0) continue;
                asList = asList.concat(key);
                changed ++;
                let o = outputs[key];
                for (let i=0; i<o.length;i++) {
                    var upd = o[i];
                    cardinality[upd] --;
                }
            }
            if (changed === 0) {
                console.log("Infinite loop on toposort!");
                return;
            }
        }
        return asList;
    }
    addForm(conf) {
        var form = document.createElement("div");
        form.setAttribute('class', 'group');
        if (conf.title !== undefined) { 
            var title = document.createElement("span")
            title.setAttribute('class', 'title');
            title.innerHTML = conf.title;
            form.appendChild(title);
        }
        for (let i=0; i<conf.fields.length; i++) {
            let field = conf.fields[i];
            let row = document.createElement('div');
            row.setAttribute('class', 'row');
            let label = document.createElement('label');
            label.setAttribute('for',field.variable);
            label.innerHTML = field.label;
            let v = this.vars[field.variable];
            if (v === undefined) {
                console.log('Undefined variable in form: ' + field.variable);
                return;
            }
            if (this.inputs[field.variable] !== undefined) {
                if (field.default !== undefined) {
                    v.set(field.default);
                }
                label.setAttribute("class", "input");
                let input = document.createElement('input');
                input.setAttribute('type', 'text');
                input.setAttribute('id', field.variable);
                input.setAttribute('class', 'input');
                input.setAttribute('value', v.get());
                let planner = this;
                input.oninput = function() {planner.onChange(field.variable)};
                row.appendChild(label);
                row.appendChild(input);
            }
            if (this.outputs[field.variable] !== undefined) {
                label.setAttribute("class", "output");
                let output = document.createElement('input');
                output.setAttribute('type', 'text');
                output.setAttribute('id', field.variable);
                output.setAttribute('class', 'output');
                output.setAttribute('disabled',null);
                output.setAttribute('value', v.display());
                row.appendChild(label);
                row.appendChild(output);
            }
            let unit = v.type;
            if (unit !== undefined) {
                let u = document.createElement('label');
                u.setAttribute('for', field.variable);
                u.setAttribute('class', 'unit');
                u.innerHTML = unit.name;
                row.appendChild(u);
            }
            form.appendChild(row);
        }
        this.base.appendChild(form);
    }
}

class Unit {
    constructor(name) {
        this.name = name;
        this.min  = undefined;
        this.max  = undefined;
        this.wrap = false;
    }

    withMin(val) {
        this.min = val;
        return this;
    }

    withMax(val) {
        this.max = val;
        return this;
    }

    withRange(min, max) {
        return this.withMin(min).withMax(max);
    }

    withWrap() {
        if (this.max === undefined) {
            console.log(this.name + ".withWrap: need a max");
            return null;
        }
        if (this.min === undefined) {
            console.log(this.name + ".withWrap: need a min");
            return null;
        }
        this.wrap = true;
        return this;
    }

    makeVar(name) {
        var v = new Var(name, this);
        return v;
    }
}

class Var {
    constructor(name, t) {
        this.name = name;
        if (t == null) {
            console.log('Null type for ' + name);
        }
        this.type = t;
    }

    get() {
        if (this === undefined) {
            console.log('Null this?');
        }
        if (this.value === undefined) {
            console.log("var " + this.name + ' of type ' + this.type.name + ' is undefined');
        }
        return this.value;
    }
    set(v) {
        if (v === undefined) {
            console.log("var " + this.name + ' of type ' + this.type.name + ' set to undefined');
        }
        this.value = v;
    }
}

class SetDecorator {
    constructor(inner, checker) {
        if (typeof inner.get !== "function") {
            console.log("inner: not a getter");
        }
        if (typeof checker !== "function") {
            console.log("checker: not a function");
        }
        this.inner = inner;

        this.checker = checker;
    }
    get() {
        return this.inner.get();
    }
    set(v) {
        return this.checker(v) && this.inner.set(v);
    }
}

function add(a, b) {
    return {
        arg: [a, b],
        get: function() {
            return  this.arg[0].get() + this.arg[1].get();
        }
    }
}

function sub(a, b) {
    return {
        arg: [a, b],
        get: function() {
            return  this.arg[0].get() - this.arg[1].get();
        }
    }
}

function neg(a) {
    return {
        arg: [a],
        get: function() {
            return - this.arg[0].get();
        }
    }
}

function mul(a, b) {
    return {
        arg: [a, b],
        get: function() {
            return this.arg[0].get() * this.arg[1].get();
        }
    }
}

function div(a, b) {
    return {
        arg: [a, b],
        get: function() {
            return this.arg[0].get() / this.arg[1].get();
        }
    }
}

function cos(a) {
    return {
        arg: [a],
        get: function() {
            let a = this.arg[0].get();
            if (a > 180) {
                a = 360 - a;
            }
            return Math.cos(a * Math.PI / 180.0);
        }
    }
}

function sin(a) {
    return {
        arg: [a],
        get: function() {
            let a = this.arg[0].get();
            if (a > 180) {
                a = 360 - a;
            }
            return Math.sin(a * Math.PI / 180.0);
        }
    }
}

function lookup(table, dimensions) {
    let n = dimensions.length;
    if (n != 2) {
        console.log('Cannot interpolate table other than 2d');
        return null;
    }

    return {
        arg: dimensions,
        get: function() {
            let dims = this.arg.slice();
            for (let i=0; i<n; i++) {
                dims[i] = dims[i].get();
            }
            return interpolate2d(table, dims);
        }
    }
}

function lt(a, b) {
    return {
        arg: [a, b],
        get: function() {
            return this.arg[0].get() < this.arg[1].get();
        }
    }
}


function eq(a, b) {
    return {
        arg: [a, b],
        get: function() {
            return this.arg[0].get() == this.arg[1].get();
        }
    }
}

function lte(a, b) {
    return {
        arg: [a, b],
        get: function() {
            return this.arg[0].get() <= this.arg[1].get();
        }
    }
}

function branch(opts) {
    return {
        arg: [opts.if, opts.then, opts.else],
        get: function() {
            return this.arg[this.arg[0].get()? 1:2].get();
        }
    }
}

function constant(value) {
    return {
        arg: [],
        get: function() {
            return value;
        }
    }
}

function round(places) {
    let k = Math.pow(10, places);
    return function(value) {
        return Math.round(value * k) / k;
    }
}

function ceil(places) {
    let k = Math.pow(10, places);
    return function(value) {
        return Math.ceil(value * k) / k;
    }
}

function identity() {
    return function(value) {
        return value;
    }
}

function loadPlanner(contId) {
    var planner = new Planner("container");

    // Units
    planner.addUnit(new Unit('deg')
        .withRange(0, 360)
        .withWrap());
    planner.addUnit(new Unit('true')
        .withRange(0, 360)
        .withWrap());
    planner.addUnit(new Unit('ft'));
    planner.addUnit(new Unit('kt'));
    planner.addUnit(new Unit('lbs'));
    planner.addUnit(new Unit('nm'));
    planner.addUnit(new Unit('%'));

    // Departure
    planner.addInput('dep_head_mag', 'deg');
    planner.addInput('dep_mag_var', 'deg');
    planner.addInput('dep_wind_true', 'true');
    planner.addInput('dep_wind_kt', 'deg');
    planner.addOutput('_offset_deg', 'deg', identity,
        sub(add(
                planner.value('dep_wind_true'),
                planner.value('dep_mag_var')),
            planner.value('dep_head_mag')));

    planner.addOutput('dep_headwind', 'kt', round(0),
        mul(planner.value('dep_wind_kt'),
            cos(planner.value('_offset_deg'))));
    planner.addOutput('dep_crosswind', 'kt', round(0),
        mul(planner.value('dep_wind_kt'),
            sin(planner.value('_offset_deg'))));

    // Payload
    planner.addInput('payload', 'lbs');
    planner.addInput('trip_dist', 'nm');
    planner.addInput('trip_tailwind', 'kt');
    planner.addOutput('air_dist', 'nm', ceil(0),
        branch({
            if: lte(planner.value('trip_dist'),
                    constant(500)),
            then: lookup(groundToAirMilesShort,
                [
                    planner.value('trip_dist'),
                    planner.value('trip_tailwind')
                ]),
            else: lookup(groundToAirMiles,
                [
                    planner.value('trip_dist'),
                    planner.value('trip_tailwind')
                ])
        }));
    // Runway slope.
    planner.addInput('near_rw_alt', 'ft');
    planner.addInput('far_rw_alt', 'ft');
    planner.addInput('runway_length', 'ft');
    planner.addOutput('runway_slope', '%', round(2),
            mul(div(sub(planner.value('far_rw_alt'),
                        planner.value('near_rw_alt')),
                    planner.value('runway_length')),
                constant(100))
        );

    // finished declaring i/o variables.
    planner.computeDeps();

    // Forms
    planner.addForm({
        title: 'Departure',
        fields: [
            {
                label: 'Magnetic variation',
                variable: 'dep_mag_var',
                default: 1,
            },
            {
                label: 'Runway heading',
                variable: 'dep_head_mag',
                default: 60,
            },
            {
                label: 'Wind direction from METAR',
                variable: 'dep_wind_true',
                default: 30,
            },
            {
                label: 'Wind speed',
                variable: 'dep_wind_kt',
                default: 5,
            },
            {
                label: 'Calculated headwind',
                variable: 'dep_headwind',
            },
            {
                label: 'Calculated crosswind',
                variable: 'dep_crosswind',
            }
        ],
    });

    planner.addForm({
        title: 'Trip',
        fields: [
            {
                label: 'Payload',
                variable: 'payload',
                default: 25000,
            },
            {
                label: 'Trip distance',
                variable: 'trip_dist',
                default: 1200,
            },
            {
                label: 'Expected tailwind',
                variable: 'trip_tailwind',
                default: 10,
            },
            {
                label: 'Calculated Air Distance',
                variable: 'air_dist',
            }
        ]
    });

    planner.addForm({
        title: 'Runway slope',
        fields: [
            {
                label: 'Near runway end',
                variable: 'near_rw_alt',
                default: 352,
            },
            {
                label: 'Far runway end',
                variable: 'far_rw_alt',
                default: 311,
            },
            {
                label: 'Runway length',
                variable: 'runway_length',
                default: 7572,
            },
            {
                label: 'Runway slope',
                variable: 'runway_slope'
            }
        ],
    });
}