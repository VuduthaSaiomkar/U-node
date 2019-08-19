'use strict';

const FabricCAServices = require('fabric-ca-client');
const { FileSystemWallet, X509WalletMixin, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);
const defaultsPath = path.resolve(__dirname, 'defaults.json');
const defaultsJSON = fs.readFileSync(defaultsPath, 'utf8');
const defaults = JSON.parse(defaultsJSON);
let Org = defaults["Organisation"]
const caURL = ccp.certificateAuthorities['ca-pharma'].url;
const ca = new FabricCAServices(caURL);
const walletPath = path.join(process.cwd(), 'wallet');
const wallet = new FileSystemWallet(walletPath);
var adminIdentity;





async function enrolluser(username, secert) {
    try {
        const userExists = await wallet.exists(username);
                if (userExists) {
                    console.log('An identity for the ' + username + ' already exists in the wallet');
                    return { "success": true, "message": "Login success" }
                }else{
                    return {success:false,"message":"please register use first"}
                }
                } catch (err) {
        return { "success": false, "message": `error connecting to network ${err}` }
    }
}

async function registeruser(username,secret,org) {
    try {
        console.log("entered into register user")
        var adminExists = await wallet.exists('admin');
        if (adminExists) {
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity:'admin', discovery: { enabled: false } });
            const adminIdentity = gateway.getCurrentIdentity();           
           // const network = await gateway.getNetwork('pharmtrack');
           // const contract = network.getContract('pharmtrack');
              try {
                await ca.register({ enrollmentID: username, enrollmentSecret: secret, role: 'client', attrs: [{ name: "OrganizationID", value: org, ecert: true }], maxEnrollments: -1 }, adminIdentity);
                const enrollment = await ca.enroll({ enrollmentID: username, enrollmentSecret: secret, attr_reqs: [{ name: "OrganizationID", optional: true }] });
                const userIdentity = X509WalletMixin.createIdentity('pharmaMSP', enrollment.certificate, enrollment.key.toBytes());
                wallet.import(username, userIdentity);
            } catch (err) {
                return { "success": false, "message": `user is not able to registered into the network,error:${err}` }
            }
            await gateway.disconnect();
            return { "success": true, "message": `successfully registered user ${username}` }
        } else {
            return { "success": false, "message": `not able to register admin into network ${err}` }
        }
    } catch (error) {
        console.error(`Failed to register user ${username}: ${error}`);
    }
}

async function enrolladmin() {
    try {
        const adminExists = await wallet.exists('admin');
        if (adminExists) {
            return { "success": true, "message": `Already Admin exists` }
        }
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const identity = X509WalletMixin.createIdentity('pharmaMSP', enrollment.certificate, enrollment.key.toBytes());
        wallet.import('admin', identity);
        return { "success": true, "message": `successfully registered Admin` }
    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        return { "success": false, "message": `Failed to enroll admin user "admin": ${error}` }
    }
}




exports.enrolluser = enrolluser;
exports.registeruser = registeruser;
exports.enrolladmin = enrolladmin;
