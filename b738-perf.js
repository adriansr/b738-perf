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

    addInput(name, typeName, initialValue) {
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
        v.set(initialValue);
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
        if (ops == null) {
            console.log('Null ops expression for output:' + name);
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
            //console.log("Deps for: " + key + " = " + list);
            for (let vi = 0; vi < list.length; vi++) {
                const v = list[vi];
                //console.log(" - " + key + ":" + vi + " = " + v);
                if (updates[v] === undefined) {
                    updates[v] = [key];
                } else {
                    updates[v].push(key);
                }
            }
        };
        //for (const key in updates) {
        //    console.log('initial updates for key:' + key + ' = ' + updates[key]);
        //}
        this.input_updates = {};
        for (const key in updates) {
            if (this.inputs[key] === undefined) continue;
            this.input_updates[key] = this._topoSort(updates[key], updates, deps);
            //console.log('updates for key:' + key + ' = ' + this.input_updates[key]);
        }
    }
    _topoSort(list, updates, deps) {
        //console.log('toposort ' + list);
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
        //for (let key in cardinality) {
        //    console.log(" - cardinality " + key + " = " + cardinality[key] + " updates " + outputs[key]);
        //}
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

function add() {
    return {
        arg: arguments,
        get: function() {
            let total = 0;
            for (let i=0; i<this.arg.length; i++) total += this.arg[i].get();
            return  total;
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
    if (n < 1 || n > 2) {
        console.log('Cannot interpolate table other than 1d or 2d');
        return null;
    }
    let fn = n == 1? interpolate1d : interpolate2d;
    return {
        arg: dimensions,
        get: function() {
            let dims = this.arg.slice();
            for (let i=0; i<n; i++) {
                dims[i] = dims[i].get();
            }
            return fn(table, dims);
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

function minutes() {
    return function(value) {
        value = Math.ceil(value);
        let h = ~~(value / 60),
            m = ~~(value % 60);
        if (m < 10) {
            m = '0' + m;
        }
        return "" + h + ":" + m;
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
    planner.addUnit(new Unit('kg'));
    planner.addUnit(new Unit('nm'));
    planner.addUnit(new Unit('%'));
    planner.addUnit(new Unit('hh:mm'));
    planner.addUnit(new Unit('num'));

    // Constants
    const EmptyWeight = constant(97060);
    const MTOW = constant(174170);
    const MLW  = constant(146275);
    const LBStoKG = constant(0.453592);
    const KGtoLBS = constant(1/0.453592);
    const TNtoLBS = constant(1000/0.453592);

    // Payload
    planner.addInput('cargo', 'lbs', 15000);
    planner.addInput('pax', 'num', 150);
    planner.addInput('pax_weight', 'lbs', 180);
    planner.addOutput('payload', 'lbs', ceil(0),
        add(
            planner.value('cargo'),
            mul(
                planner.value('pax'),
                planner.value('pax_weight')
            )
        )
    );
    planner.addOutput('zero_fuel_lbs', 'lbs', ceil(0),
        add(EmptyWeight,
            planner.value('payload')));
    planner.addOutput('zero_fuel_kg', 'kg', ceil(0),
        mul(planner.value('zero_fuel_lbs'),
            LBStoKG));

    // Minimum fuel
    planner.addInput('min_fuel', 'lbs', 2205);
    planner.addInput('extra_fuel', 'lbs', 2205);
    planner.addInput('arr_taxi_fuel', 'lbs', 500);
    planner.addOutput('alt_arr_fuel', 'lbs', ceil(0),
        add(
            planner.value('min_fuel'),
            planner.value('extra_fuel'),
            planner.value('arr_taxi_fuel'),
        )
    );
    planner.addOutput('alt_arr_lbs', 'lbs', ceil(0),
        add(planner.value('zero_fuel_lbs'),
            planner.value('alt_arr_fuel')));
    planner.addOutput('alt_arr_kg', 'kg', ceil(0),
            mul(planner.value('alt_arr_lbs'), LBStoKG));
    
    // Alternate
    planner.addInput('alt_dist', 'nm', 100);
    planner.addInput('alt_tailwind', 'kt', 0);
    planner.addOutput('alt_air_dist', 'nm', round(1),
        lookup(groundToAirMilesShort,
            [
                planner.value('alt_dist'),
                planner.value('alt_tailwind')
            ]));
    planner.addOutput('alt_time', 'hh:mm', minutes(),
        lookup(tripTimeRequiredShort,
            [
                planner.value('alt_air_dist'),
            ]));
    planner.addOutput('alt_altitude', 'ft', round(0),
        lookup(tripAltitudeRequiredShort,
            [
                planner.value('alt_air_dist'),
                planner.value('alt_arr_kg')
            ]));
    planner.addOutput('alt_fuel', 'lbs', ceil(0),
        mul(TNtoLBS,
            lookup(tripFuelRequiredShort,
                [
                    planner.value('alt_air_dist'),
                    planner.value('alt_arr_kg')
                ])));

    planner.addOutput('arr_fuel', 'lbs', ceil(0),
        add(planner.value('alt_fuel'),
            planner.value('alt_arr_fuel')));
    planner.addOutput('arr_weight', 'lbs', ceil(0),
        add(planner.value('arr_fuel'),
            planner.value('zero_fuel_lbs')));
    planner.addOutput('arr_weight_kgs', 'kg', ceil(0),
            mul(LBStoKG,
                planner.value('arr_weight')));
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

    // Trip
    planner.addInput('trip_dist', 'nm', 1150);
    planner.addInput('trip_tailwind', 'kt', 0);
    planner.addInput('trip_alt', 'ft', 35000);
    planner.addOutput('air_dist', 'nm', round(1),
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
    planner.addOutput('trip_time', 'hh:mm', minutes(),
        lookup(tripTimeRequired,
            [
                planner.value('air_dist'),
                planner.value('trip_alt')
            ])
    );
    planner.addOutput('_trip_base_fuel_tn', 'lbs', round(3),
        lookup(tripFuelRequired,
            [
                planner.value('air_dist'),
                planner.value('trip_alt')
            ]));

    planner.addOutput('trip_burn_lbs', 'lbs', ceil(0),
        mul(TNtoLBS,
        add(planner.value('_trip_base_fuel_tn'),
            lookup(tripFuelAdjustments,
                [
                    planner.value('_trip_base_fuel_tn'),
                    planner.value('arr_weight_kgs')
                ]))));
    planner.addOutput('dep_fuel', 'lbs', ceil(0),
        add(planner.value('arr_fuel'),
            planner.value('trip_burn_lbs')));
    planner.addOutput('dep_weight_lbs', 'lbs', ceil(0),
            add(planner.value('arr_weight'),
                planner.value('trip_burn_lbs')));
    planner.addOutput('dep_weight_kgs', 'kg', ceil(0),
            mul(planner.value('dep_weight_lbs'),
                LBStoKG));
        
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
        title: 'Payload',
        fields: [
            {
                label: 'Cargo weight',
                variable: 'cargo',
            },
            {
                label: 'Passengers',
                variable: 'pax',
            },
            {
                label: 'Weight per pax',
                variable: 'pax_weight',
            },
            {
                label: 'Payload weight',
                variable: 'payload',
            },
            {
                label: 'Zero fuel weight',
                variable: 'zero_fuel_lbs',
            },
            {
                label: '',
                variable: 'zero_fuel_kg',
            }
        ]
    });

    planner.addForm({
        title: 'Minimum fuel',
        fields: [
            {
                label: 'Emergency fuel',
                variable: 'min_fuel',
            },
            {
                label: 'Extra fuel',
                variable: 'extra_fuel',
            },
            {
                label: 'Arrival taxi fuel',
                variable: 'arr_taxi_fuel',
            },
            {
                label: 'Landing fuel (alternate)',
                variable: 'alt_arr_fuel',
            },
            {
                label: 'Landing weight (alternate)',
                variable: 'alt_arr_lbs',
            },
            {
                label: '',
                variable: 'alt_arr_kg',
            }
        ]
    });


    planner.addForm({
        title: 'Alternate',
        fields: [
            {
                label: 'Distance',
                variable: 'alt_dist',
            },
            {
                label: 'Tailwind factor',
                variable: 'alt_tailwind',
            },
            {
                label: 'Air distance',
                variable: 'alt_air_dist',
            },
            {
                label: 'Flight time',
                variable: 'alt_time',
            },
            {
                label: 'Flight altitude',
                variable: 'alt_altitude',
            },
            {
                label: 'Fuel required',
                variable: 'alt_fuel',
            }
        ]
    });

    planner.addForm({
        title: 'Trip',
        fields: [
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
                label: 'Cruise altitude (29000-37000)',
                variable: 'trip_alt'
            },
            {
                label: 'Calculated Air Distance',
                variable: 'air_dist',
            },
            {
                label: 'Trip time',
                variable: 'trip_time',
            },
            {
                label: 'Fuel burn',
                variable: 'trip_burn_lbs',
            },
            {
                label: 'Arrival weight',
                variable: 'arr_weight',
            },
            {
                label: 'Arrival weight',
                variable: 'arr_weight_kgs',
            },
            {
                label: 'Departure fuel',
                variable: 'dep_fuel',
            },
            {
                label: 'Departure weight',
                variable: 'dep_weight_lbs',
            },
            {
                label: 'Departure weight',
                variable: 'dep_weight_kgs',
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
}
