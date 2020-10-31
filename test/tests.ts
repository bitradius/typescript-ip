// Copyright (c) 2020, BitRadius Holdings, LLC
//
// Please see the included LICENSE file for more information.

import { describe, it } from 'mocha';
import { IP } from '../src';
import * as assert from 'assert';
import * as BigInteger from 'big-integer';

describe('Functional Tests', () => {
    describe('Split Host into IP & Port', () => {
        it('Split: 192.168.2.1:9999', () => {
            const [host, port] = IP.splitHostPort('192.168.2.1:9999');

            assert(host === '192.168.2.1' && port === 9999);
        });

        it('Split: 192.168.2.1', () => {
            const [host, port] = IP.splitHostPort('192.168.2.1');

            assert(host === '192.168.2.1' && port === 0);
        });

        it('Split: [2607:f8b0:4009:805::200e]:9999', () => {
            const [host, port] = IP.splitHostPort('[2607:f8b0:4009:805::200e]:9999');

            assert(host === '[2607:f8b0:4009:805::200e]' && port === 9999);
        });

        it('Split: [2607:f8b0:4009:805::200e]', () => {
            const [host, port] = IP.splitHostPort('[2607:f8b0:4009:805::200e]');

            assert(host === '[2607:f8b0:4009:805::200e]' && port === 0);
        });

        it('Split: [2607:f8b0:4009:805::200e%eth1]:9999', () => {
            const [host, port] = IP.splitHostPort('[2607:f8b0:4009:805::200e%eth1]:9999');

            assert(host === '[2607:f8b0:4009:805::200e%eth1]' && port === 9999);
        });

        it('Fail to Split: 2607:f8b0:4009:805::200e:9999', () => {
            try {
                IP.splitHostPort('2607:f8b0:4009:805::200e:9999');

                assert(false);
            } catch {
                assert(true);
            }
        });

        it('Fail to Split: [2607:f8b0:4009:805::200e]:dead', () => {
            try {
                IP.splitHostPort('[2607:f8b0:4009:805::200e]:dead');

                assert(false);
            } catch {
                assert(true);
            }
        });

        it('Fail to Split: 192.168.2.1:dead', () => {
            try {
                IP.splitHostPort('192.168.2.1:dead');

                assert(false);
            } catch {
                assert(true);
            }
        });
    });

    describe('IPv4', () => {
        const ips = [
            {
                dotted: '0.0.0.0',
                mapped: '0:0:0:0:0:ffff:0:0',
                decimal: 0
            },
            {
                dotted: '192.168.2.1',
                mapped: '0:0:0:0:0:ffff:c0a8:201',
                decimal: 3232236033
            },
            {
                dotted: '255.255.255.255',
                mapped: '0:0:0:0:0:ffff:ffff:ffff',
                decimal: 4294967295
            }
        ];

        for (const ip of ips) {
            describe(ip.dotted, () => {
                it('Dotted', () => {
                    const parsed = IP.parse(ip.dotted);

                    assert(parsed.isV4 && parsed.toString() === ip.dotted);
                    assert(parsed.toString('mapped') === ip.mapped);
                    assert(parsed.decimal.toJSNumber() === ip.decimal);
                });

                it('v6 Mapped', () => {
                    const parsed = IP.parse(ip.mapped);

                    assert(parsed.isV4 && parsed.toString() === ip.dotted);
                    assert(parsed.toString('mapped') === ip.mapped);
                    assert(parsed.decimal.toJSNumber() === ip.decimal);
                });

                it('Decimal', () => {
                    const parsed = IP.fromDecimal(ip.decimal);

                    assert(parsed.isV4 && parsed.toString() === ip.dotted);
                    assert(parsed.toString('mapped') === ip.mapped);
                    assert(parsed.decimal.toJSNumber() === ip.decimal);
                });
            });
        }

        it('Fail Parse: 192.168.2.', () => {
            try {
                IP.parse('192.168.2.');

                assert(false);
            } catch {
                assert(true);
            }
        });
    });

    describe('IPv6', () => {
        const ips = [
            {
                dotted: '::',
                expanded: '0:0:0:0:0:0:0:0',
                decimal: BigInteger.zero
            },
            {
                dotted: '::b6',
                expanded: '0:0:0:0:0:0:0:b6',
                decimal: BigInteger('b6', 16)
            },
            {
                dotted: 'fe80::c71:69ab:9995:b5e0',
                expanded: 'fe80:0:0:0:c71:69ab:9995:b5e0',
                decimal: BigInteger('fe800000000000000c7169ab9995b5e0', 16)
            },
            {
                dotted: '2607:f8b0:4009:805::200e',
                expanded: '2607:f8b0:4009:805:0:0:0:200e',
                decimal: BigInteger('2607f8b040090805000000000000200e', 16)
            },
            {
                dotted: '2607:f8b0:4009:805::',
                expanded: '2607:f8b0:4009:805:0:0:0:0',
                decimal: BigInteger('2607f8b0400908050000000000000000', 16)
            }
        ];

        for (const ip of ips) {
            describe(ip.dotted, () => {
                it('Dotted', () => {
                    const parsed = IP.parse(ip.dotted);

                    assert(!parsed.isV4 && parsed.toString() === ip.dotted);
                    assert(parsed.toString('expanded') === ip.expanded);
                    assert.deepStrictEqual(parsed.decimal, ip.decimal);
                });

                it('Expanded', () => {
                    const parsed = IP.parse(ip.expanded);

                    assert(!parsed.isV4 && parsed.toString() === ip.dotted);
                    assert(parsed.toString('expanded') === ip.expanded);
                    assert.deepStrictEqual(parsed.decimal, ip.decimal);
                });

                it('Decimal', () => {
                    const parsed = IP.fromDecimal(ip.decimal, true);

                    assert(!parsed.isV4 && parsed.toString() === ip.dotted);
                    assert(parsed.toString('expanded') === ip.expanded);
                    assert.deepStrictEqual(parsed.decimal, ip.decimal);
                });
            });
        }
    });
});
