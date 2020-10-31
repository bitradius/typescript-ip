// Copyright (c) 2020, BitRadius Holdings, LLC
//
// Please see the included LICENSE file for more information.

import * as BigInteger from 'big-integer';

/** @ignore */
const mappedV4Prefix = Buffer.from('00000000000000000000ffff', 'hex');

export class IP {
    protected m_bytes: Buffer = Buffer.alloc(16);
    protected m_isV4 = false;
    protected m_zone?: string;

    /**
     * Returns the IP address as a Uint8Array
     */
    public get bytes (): Uint8Array {
        return this.m_bytes;
    }

    /**
     * Returns the IP address as a Buffer
     */
    public get buffer (): Buffer {
        return this.m_bytes;
    }

    /**
     * Whether the address is a v4 Address
     */
    public get isV4 (): boolean {
        return this.m_isV4;
    }

    /**
     * Returns a zone (RFC6874) ID if available
     */
    public get zone (): string | undefined {
        return this.m_zone;
    }

    /**
     * Returns the decimal representation of the IP Address
     */
    public get decimal (): BigInteger.BigInteger {
        if (this.isV4) {
            return BigInteger(this.buffer.slice(12).toString('hex'), 16);
        } else {
            return BigInteger(this.buffer.toString('hex'), 16);
        }
    }

    /**
     * Splits a host (ie. ip:port) into the IP address and port number
     * @param host the host to split
     */
    public static splitHostPort (host: string): [string, number] {
        if (host.indexOf('.') !== -1) {
            const parts = host.split(':');

            if (parts.length === 2) {
                return [parts[0], parseInt(parts[1], 10)];
            }

            return [parts[0], 0];
        }

        if (host.indexOf('[') !== -1 && host.indexOf(']') !== -1) {
            const _host = host.substring(0, host.indexOf(']') + 1);

            const right = host.substring(host.indexOf(']') + 1);

            if (right.length === 0) {
                return [_host, 0];
            }

            const rightParts = right.split(':');

            if (rightParts.length === 2) {
                const port = rightParts[1];

                return [_host, parseInt(port || '0', 10)];
            }
        }

        throw new Error('Cannot split IP address and port from host');
    }

    /**
     * Parses the given string into an IP address
     * @param address the string representation of the IP address to parse
     */
    public static parse (address: string): IP {
        const ip = new IP();

        if (address[0] === '[' && address[address.length - 1] === ']') {
            address = address.substring(1, address.length - 1);
        }

        if (address === '::') {
            return ip;
        }

        if (IP.isIPv4(address)) {
            ip.m_bytes = IP.v4StringToBuffer(address);

            ip.m_isV4 = true;
        } else if (IP.isIPv6(address)) {
            [ip.m_bytes, ip.m_zone] = IP.v6StringToBuffer(address);

            if (ip.m_bytes[0] === 0 && ip.m_bytes.slice(0, 12).compare(mappedV4Prefix) === 0) {
                ip.m_isV4 = true;
            }
        } else {
            throw new Error('Not a valid IP address');
        }

        return ip;
    }

    /**
     * Creates a new instance of an IP address from the given decimal value
     * @param decimal the decimal representation of the IP address to create
     * @param forceV6 whether to force the decimal into v6 space
     */
    public static fromDecimal (decimal: BigInteger.BigInteger | number, forceV6 = false): IP {
        if (typeof decimal === 'number') {
            decimal = BigInteger(decimal);
        }

        const hex = decimal.toString(16)
            .padStart(32, '0');

        const ip = new IP();

        ip.m_bytes = Buffer.from(hex, 'hex');

        const empty = Buffer.alloc(12);

        if (!forceV6 && ip.m_bytes.slice(0, 12).compare(empty) === 0) {
            mappedV4Prefix.copy(ip.m_bytes, 0, 0);

            ip.m_isV4 = true;
        }

        return ip;
    }

    private static isIPv4 (ip: string): boolean {
        return /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.test(ip);
    }

    private static isIPv6 (ip: string): boolean {
        return /[0-9a-f:%]+/.test(ip);
    }

    private static v4StringToBuffer (ip: string): Buffer {
        const bytes = ip.split('.')
            .map(octet => parseInt(octet, 10));

        const ipBuffer = Buffer.from(bytes);

        const buffer = Buffer.alloc(16);

        mappedV4Prefix.copy(buffer, 0, 0);

        ipBuffer.copy(buffer, 12, 0, 4);

        return buffer;
    }

    private static v6StringToBuffer (ip: string): [Buffer, string?] {
        let zone: string | undefined;

        // if it has a zone on it, then split that off
        if (ip.indexOf('%') !== -1) {
            const parts = ip.split('%');

            // we can only have one zone
            if (parts.length > 2) {
                throw new Error('Not a valid IP address');
            }

            ip = parts[0];

            zone = parts[1];
        }

        ip = IP.expandV6(ip);

        ip = ip.split(':')
            .join('');

        return [Buffer.from(ip, 'hex'), zone];
    }

    private static v4ToString (bytes: Buffer, mapped = false): string {
        if (!mapped) {
            return bytes.slice(12)
                .map((byte: any) => byte.toString())
                .join('.');
        } else {
            return IP.v6ToString(bytes, mapped);
        }
    }

    private static v6ToString (bytes: Buffer, expanded = false): string {
        const hex = bytes.toString('hex');

        const octets = hex.match(/[0-9a-f]{4}/g);

        if (!octets) {
            throw new Error('Could not encode IP address to string');
        }

        if (!expanded) {
            return IP.compressV6(octets.join(':'));
        } else {
            return octets.map(octet => parseInt(octet, 16).toString(16))
                .join(':')
                .replace(/0000/g, '0');
        }
    }

    private static expandV6 (address: string): string {
        const octets = address.split(':');

        if (address.startsWith('::')) {
            octets.shift();
        }

        const tmp: string[] = [];

        for (const octet of octets) {
            if (octet.length !== 0) {
                tmp.push(octet.padStart(4, '0'));
            } else {
                const ins = 8 - octets.length + 1;

                for (let i = 0; i < ins; i++) {
                    tmp.push('0000');
                }
            }
        }

        return tmp.join(':');
    }

    private static compressV6 (address: string): string {
        const zeros = ['0000', '0000', '0000', '0000', '0000', '0000', '0000', '0000'];

        while (zeros.length > 1) {
            const repl = zeros.join(':');

            if (address.indexOf(repl) !== -1) {
                address = address.replace(repl, '');

                break;
            }

            zeros.pop();
        }

        if (address[0] === ':') {
            address = ':' + address;
        } else if (address.length === 0) {
            address = '::';
        }

        return address.split(':')
            .map(octet => (octet) ? parseInt(octet, 16).toString(16) : null)
            .join(':');
    }

    /**
     * Returns the string representation of the IP address
     * @param encoding Whether we will use any special encoding or not
     */
    public toString (encoding?: 'mapped' | 'expanded'): string {
        if (this.isV4) {
            return IP.v4ToString(this.buffer, (encoding === 'mapped'));
        } else {
            if (!this.zone) {
                return IP.v6ToString(this.buffer, (encoding === 'expanded'));
            }

            return IP.v6ToString(this.buffer, (encoding === 'expanded')) + '%' + this.zone;
        }
    }
}
