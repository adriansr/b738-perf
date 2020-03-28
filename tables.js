function range(from, to, step) {
    let r = [];
    for (let i=from; i<=to; i+=step) {
        r.push(i);
    }
    return r;
}
var groundToAirMiles = {
    keys: [ 
        // Ground distance for trip (nm).
        range(200,5000,200),

        // Tailwind factor (kt).
        range(-100,100,20),
    ],

    // Data extracted from:
    // BOEING 737-600/-700/-800/-900 Operations Manual
    // Page PD-31-2
    //
    // Copyright (c) 1997 The Boeing Company
    // All Rights Reserved
    // Document Number D6-27370-TBC November 20, 1997
    // Revision Number: 10
    // Revision Date: September 30, 2002
    data: [
        [ 279,  259,  241,  226,  212,  200,  190,  181,  173,  166,  160],
        [ 554,  515,  480,  450,  424,  400,  382,  365,  349,  335,  322],
        [ 829,  771,  720,  675,  636,  600,  573,  548,  525,  504,  485],
        [1103, 1027,  958,  899,  847,  800,  764,  732,  701,  673,  648],
        [1376, 1282, 1197, 1123, 1059, 1000,  956,  915,  877,  843,  811], 
        [1649, 1536, 1435, 1348, 1270, 1200, 1147, 1098, 1053, 1012,  974],
        [1921, 1791, 1673, 1571, 1482, 1400, 1339, 1282, 1229, 1181, 1138],
        [2192, 2044, 1911, 1795, 1693, 1600, 1530, 1465, 1405, 1351, 1301],
        [2463, 2297, 2148, 2019, 1904, 1800, 1721, 1648, 1581, 1520, 1465],
        [2733, 2550, 2386, 2242, 2115, 2000, 1913, 1832, 1758, 1690, 1628],
        [3003, 2803, 2622, 2465, 2326, 2200, 2105, 2016, 1934, 1859, 1791],
        [3272, 3054, 2859, 2688, 2537, 2400, 2296, 2200, 2111, 2029, 1955],
        [3540, 3306, 3095, 2911, 2748, 2600, 2488, 2384, 2287, 2199, 2119],
        [3807, 3556, 3330, 3133, 2959, 2800, 2680, 2568, 2464, 2369, 2282],
        [4074, 3807, 3566, 3356, 3169, 3000, 2871, 2752, 2641, 2539, 2446],
        [4340, 4057, 3801, 3578, 3380, 3200, 3063, 2935, 2817, 2709, 2610],
        [4606, 4306, 4036, 3800, 3590, 3400, 3255, 3119, 2994, 2879, 2774],
        [4870, 4555, 4270, 4021, 3801, 3600, 3446, 3303, 3171, 3049, 2938],
        [5134, 4803, 4504, 4243, 4011, 3800, 3638, 3487, 3347, 3219, 3102],
        [5397, 5051, 4738, 4464, 4221, 4000, 3830, 3671, 3524, 3389, 3266],
        [5659, 5298, 4971, 4685, 4431, 4200, 4021, 3855, 3701, 3559, 3430],
        [5920, 5544, 5204, 4906, 4641, 4400, 4213, 4038, 3877, 3729, 3594],
        [6181, 5790, 5437, 5127, 4851, 4600, 4404, 4222, 4054, 3899, 3758],
        [6440, 6035, 5669, 5347, 5061, 4800, 4596, 4406, 4230, 4069, 3921],
        [6699, 6280, 5901, 5568, 5271, 5000, 4787, 4589, 4406, 4238, 4085]
    ]
}

function interpolate2d(table, dims) {
    let n = dims.length;
    if (n != 2 || n != table.keys.length) {
        console.log("bad dimensions to interpolate2d table");
        return null;
    }
    let x = nearestIdx(table.keys[0], dims[0]);
    let y = nearestIdx(table.keys[1], dims[1]);
    let iy0 = linearInterpolate(table.keys[0][x[0]], table.data[x[0]][y[0]],
                                table.keys[0][x[1]], table.data[x[1]][y[0]],
                                dims[0]);
    let iy1 = linearInterpolate(table.keys[0][x[0]], table.data[x[0]][y[1]],
                                table.keys[0][x[1]], table.data[x[1]][y[1]],
                                dims[0]);
    let r   = linearInterpolate(table.keys[1][y[0]], iy0,
                                table.keys[1][y[1]], iy1,
                                dims[1]);
    console.log('interpolate dims:' + dims + ' r:'+r);
    return r;
}

function nearestIdx(list, value) {
    let min = 0, max = list.length;
    while (min + 1 < max) {
        let mid = ~~((max + min) / 2);
        if (list[mid] == value) {
            console.log('nearestIdx: '+list+' for value:'+value+' exact:'+mid+'['+list[mid]+']');
            return [mid, mid];
        }
        if (list[mid] < value) {
            min = mid;
        } else {
            max = mid;
        }
    }
    console.log('nearestIdx: '+list+' for value:'+value+' range min:'+min+'['+list[min]+'] max:'+max+'['+list[max]+']');
    return [min, max];
}

function linearInterpolate(x1, y1, x2, y2, x) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    if (dx == 0) return y1;
    let r = y1 + dy * (x - x1) / dx;
    return r;
}

interpolate2d(groundToAirMiles, [2920, -50]);