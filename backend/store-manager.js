'use strict';
const JsonFn = require('json-fn');
const _ = require('lodash');
const path = require('path');
const q = require('q');
const cms = require('cmsmon').instance;

const deasync = require("deasync");

function async(fn) {
    function _async(fn, _this) {
        let result = false, done = false;
        q.spawn(function*() {
            result = yield* fn.bind(_this)();
            done = true;
        })
        deasync.loopWhile(()=>!done);
        return result;
    }

    return function () {
        return _async(fn, this);
    }
}

const {mongoose, utils:{makeSelect, makeMultiSelect, makeTypeSelect, makeStyles, makeCustomSelect}} = cms;

const ConvertType = [{
    unit2: {type: mongoose.Schema.Types.ObjectId, ref: 'Unit', autopopulate: true},
    quantity: Number,
    unit1: {type: mongoose.Schema.Types.ObjectId, ref: 'Unit', autopopulate: true},
}];

const Brand = cms.registerSchema({
    name: {type: String}
}, {
    name: 'Brand',
    formatter: `
            <h4>{{model.name}}</h4>
        `,
    title: 'name',
    isViewElement: false,
    alwaysLoad: true
});

const Reason = cms.registerSchema({
    name: {type: String}
}, {
    name: 'Reason',
    formatter: `
            <h4>{{model.name}}</h4>
        `,
    title: 'name',
    isViewElement: false,
    alwaysLoad: true
});

const Unit = cms.registerSchema({
    name: {type: String}
}, {
    name: 'Unit',
    formatter: `
            <h4>{{model.name}}</h4>
        `,
    title: 'name',
    isViewElement: false,
    alwaysLoad: true
});

const Category = cms.registerSchema({
    name: {type: String, default: 'Name'},
    parent: {type: mongoose.Schema.Types.ObjectId, ref: 'Category', autopopulate: true}
}, {
    name: 'Category',
    formatter: `
            <h4>{{model.name}}</h4>
        `,
    title: 'name',
    isViewElement: false,
    autopopulate: true,
    alwaysLoad: true
});

const {convertTo, Inventory} = require('./inventory')

const Product = cms.registerSchema({
    name: {type: String},
    Id: String,
    brand: {type: mongoose.Schema.Types.ObjectId, ref: 'Brand', autopopulate: true},
    picture: {type: String, form: {type: 'image'}},
    minStockQuantity: Number,
    importVat: {type: Number, default: 7},
    importUnit: {type: mongoose.Schema.Types.ObjectId, ref: 'Unit', autopopulate: true},
    importPrice: Number,
    exportVat: {type: Number, default: 7},
    exportUnit: {type: mongoose.Schema.Types.ObjectId, ref: 'Unit', autopopulate: true},
    exportPrice: Number,
    convert: ConvertType,
    category: [{type: mongoose.Schema.Types.ObjectId, ref: 'Category', autopopulate: true}],

}, {
    name: 'Product',
    formatterUrl: 'backend/product.html',
    title: 'name',
    isViewElement: false,
    mTemplate: `
            <StackLayout>
                <Label text="{{model.name}} - {{model.position}} - {{model.maxHour}}"></Label>
            </StackLayout>
        `,
    fn: {},
    serverFn: {
        customName: function*() {
            return this.name;
        }
    },
    autopopulate: true,
    alwaysLoad: true,
    tabs: [
        {title: 'basic'},
        {
            title: 'detail',
            fields: ['importPrice', 'exportPrice', 'importVat', 'exportVat', 'importUnit', 'exportUnit']
        },
        {
            title: 'convert',
            fields: ['convert']
        }
    ],
    initSchema: function (schema) {
        schema.virtual('inventory').get(async(function*() {
            const inventory = new Inventory(cms, this);
            yield* inventory.init();
            return inventory.getSum();
        }))
    }
});

const Location = cms.registerSchema({
    name: {type: String}
}, {
    name: 'Location',
    formatter: `
            <h4>{{model.name}}</h4>
        `,
    title: 'name',
    isViewElement: false,
    autopopulate: true,
    alwaysLoad: true
});

const AddressType = {
    name: String,
    street: String,
    zipcode: Number,
    city: String
}

const Customer = cms.registerSchema({
    name: {type: String},
    contactPerson: String,
    Id: String,
    address: {
        name: String,
        street: String,
        zipcode: Number,
        city: String
    },
    location: {type: mongoose.Schema.Types.ObjectId, ref: 'Location', autopopulate: true},
    phone: String,
    fax: String,
    email: {
        type: String,
        form: {
            type: 'input',
            templateOptions: {
                type: 'email',
                label: 'Email'
            }
        }
    },
    note: String
}, {
    name: 'Customer',
    formatter: `
            <h4>{{model.name}} - {{model.position}} - {{model.maxHour}}</h4>
        `,
    title: 'name',
    isViewElement: false,
    mTemplate: `
            <StackLayout>
                <Label text="{{model.name}} - {{model.position}} - {{model.maxHour}}"></Label>
            </StackLayout>
        `,
    fn: {},
    autopopulate: true,
    alwaysLoad: true,
    tabs: [
        {title: 'basic'},
        {title: 'detail', fields: ['address', 'location']}
    ]
});

const Provider = cms.registerSchema({
    name: {type: String},
    Id: String,
    address: AddressType,
    phone: Number,
    fax: Number,
    email: {
        type: String,
        form: {
            type: 'input',
            templateOptions: {
                type: 'email',
                label: 'Email'
            }
        }
    },
    note: String
}, {
    name: 'Provider',
    formatter: `
            <h4>{{model.name}} - {{model.position}} - {{model.maxHour}}</h4>
        `,
    title: 'name',
    isViewElement: false,
    mTemplate: `
            <StackLayout>
                <Label text="{{model.name}} - {{model.position}} - {{model.maxHour}}"></Label>
            </StackLayout>
        `,
    fn: {},
    autopopulate: true,
    alwaysLoad: true
});

// todo: when to use import


const unitFormImport = {
    templateManipulators: {
        preWrapper: [
            function (template, options, scope) {
                scope.$watch('model.product', () => {
                    if (scope.model.product) {
                        scope.model.unit = scope.model.product.importUnit;
                        scope.model.price = scope.model.product.importPrice;
                    }
                })

                return template;
            }
        ]
    }
};
const Import = cms.registerSchema({
    date: {type: Date, default: Date.now()},
    Id: String,
    status: {type: String, form: makeSelect('OrderOnTheWay', 'Received')},
    provider: {type: mongoose.Schema.Types.ObjectId, ref: 'Provider', autopopulate: true},
    note: String,
    item: {
        type: [{
            // convert: ConvertType,
            price: Number,
            unit: {type: mongoose.Schema.Types.ObjectId, ref: 'Unit', autopopulate: true, form: unitFormImport},
            quantity: Number,
            product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', autopopulate: true},
        }],
        form: {
            type: 'tableSection'
        }
    }
}, {
    name: 'Import',
    formatter: `
            <h4>{{model.date}}</h4>
        `,
    title: 'date',
    isViewElement: false,
    mTemplate: `
            <StackLayout>
                <Label text="{{model.name}} - {{model.position}} - {{model.maxHour}}"></Label>
            </StackLayout>
        `,
    fn: {},
    autopopulate: true,
    tabs: [
        {title: 'basic'},
        {title: 'detail', fields: ['item']}
    ]
});

const unitFormExport = {
    templateManipulators: {
        preWrapper: [
            function (template, options, scope) {
                scope.$watch('model.product', () => {
                    if (scope.model.product) {
                        scope.model.unit = scope.model.product.exportUnit;
                        scope.model.price = scope.model.product.exportPrice;
                    }
                })

                return template;
            }
        ]
    }
};

const Export = cms.registerSchema({
    date: {type: Date, default: Date.now()},
    Id: String,
    status: {type: String, form: makeSelect('OrderReceived', 'Paid', 'Delivered')},
    //provider: {type: mongoose.Schema.Types.ObjectId, ref: 'Provider', autopopulate: true},
    note: String,
    item: {
        type: [{
            billPrice: Number,
            billQuantity: Number,
            price: Number,
            unit: {type: mongoose.Schema.Types.ObjectId, ref: 'Unit', autopopulate: true, form: unitFormExport},
            quantity: Number,
            product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', autopopulate: true},

        }],
        form: {
            type: 'tableSection'
        }
    },
    returnItem: {
        type: [{
            disposal: {type: Boolean, default: true},
            quantity: Number,
            product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', autopopulate: true},
        }],
        form: {
            type: 'tableSection'
        }
    }
}, {
    name: 'Export',
    formatter: `
            <h4>{{model.name}} - {{model.position}} - {{model.maxHour}}</h4>
        `,
    title: 'date',
    isViewElement: false,
    mTemplate: `
            <StackLayout>
                <Label text="{{model.name}} - {{model.position}} - {{model.maxHour}}"></Label>
            </StackLayout>
        `,
    fn: {},
    autopopulate: true,
    tabs: [
        {title: 'basic'},
        {title: 'detail', fields: ['item']},
        {title: 'return', fields: ['returnItem']}
    ]
});

const unitFormAdjustment = {
    templateManipulators: {
        preWrapper: [
            function (template, options, scope) {
                scope.$watch('model.product', () => {
                    if (scope.model.product) {
                        scope.model.unit = scope.model.product.exportUnit;
                        scope.model.price = scope.model.product.exportPrice;
                    }
                })

                return template;
            }
        ]
    }
};

const Adjustment = cms.registerSchema({
    date: {type: Date, default: Date.now()},
    adjustBy: {type: mongoose.Schema.Types.ObjectId, ref: 'Employee', autopopulate: true},
    reason: {type: mongoose.Schema.Types.ObjectId, ref: 'Reason', autopopulate: true},
    item: {
        type: [{
            unit: {type: mongoose.Schema.Types.ObjectId, ref: 'Unit', autopopulate: true, form: unitFormAdjustment},
            quantity: Number,
            product: {type: mongoose.Schema.Types.ObjectId, ref: 'Product', autopopulate: true},
        }],
        form: {
            type: 'tableSection'
        }
    }
}, {
    name: 'Adjustment',
    formatter: `
            <h4>{{model.name}} - {{model.position}} - {{model.maxHour}}</h4>
        `,
    title: 'date',
    isViewElement: false,
    mTemplate: `
            <StackLayout>
                <Label text="{{model.name}} - {{model.position}} - {{model.maxHour}}"></Label>
            </StackLayout>
        `,
    fn: {},
    autopopulate: true,
    tabs: [
        {title: 'basic'},
        {title: 'detail', fields: ['item']}
    ]
});

const Employee = cms.registerSchema({
    name: {type: String, default: 'Employee'},
    Id: String,
    position: {type: String, form: makeSelect('waiter', 'chef', 'manager')}
}, {
    name: 'Employee',
    formatter: `
            <h4>{{model.name}} - {{model.position}} - {{model.maxHour}}</h4>
        `,
    title: 'name',
    isViewElement: false,
    mTemplate: `
            <StackLayout>
                <Label text="{{model.name}} - {{model.position}} - {{model.maxHour}}"></Label>
            </StackLayout>
        `,
    fn: {},
    autopopulate: true

});

