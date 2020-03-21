class Planner {
    constructor(containerId) {
        this.base = document.getElementById(containerId);
        if (this.base == null) {
            console.log("Base container " + containerId + "does not exists");
        }
        this.unit = {}

    }
    getBaseContainer() {
        var base = document.getElementById("base_container");
        if (base === null) {
            console.log("No 'base_container' element defined in your HTML.");
        }
        return base;
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
        if (!this.validName(u.name())) {
            console.log('Invalid name for a unit: ' + u.name());
            return null;
        }
        if (this.unit[u.name()] !== undefined) {
            console.log('Unit redeclared: ' + u.name());
            return null;
        }
        this.unit[u.name()] = u;
    }
}

class Unit {
    constructor(name) {
        this.name = name;
        this.min  = undefined;
        this.max  = undefined;
        this.wrap = false;
    }

    name() {
        return this.name;
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

    }
}

class Var {
    constructor(name, type) {
        this.name = name;
        this.type = t;
    }

    get() {
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

function loadPlanner(contId) {
    var planner = new Planner();
    planner.addUnit(new Unit('deg')
        .withRange(0, 360)
        .withWrap());
    planner.addUnit(new Unit('ft'));
    planner.addUnit(new Unit('kt'));
    planner.addVar('dep_rw_head_mag', 'deg');
    planner.addVar('dep_mag_dev', 'deg');
    planner.addVar('dep_wind_true', 'deg');
    planner.addVar('dep_hwind', 'deg');
    planner.addVar('dep_xwind', 'deg');
    planner.addUnit('ft');
    fWinds.addVar()
}