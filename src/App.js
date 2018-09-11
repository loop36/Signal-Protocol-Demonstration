import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Server from './Server/server'

class App extends Component {

//   componentDidMount = async () => {

//     var KeyHelper = libsignal.KeyHelper;

//     //Create Alice and Bob
//     let alice = {};
//     let bob = {};

//     //Create addresses
//     alice.address = new libsignal.SignalProtocolAddress("alice", 1);
//     bob.address  = new libsignal.SignalProtocolAddress("bob", 1);

//     //Create Stores
//     alice.store = new SignalProtocolStore();
//     bob.store = new SignalProtocolStore();

//     //Create identities
//     await alice.store.put('identityKey', KeyHelper.generateIdentityKeyPair())
//     await alice.store.put('registrationId', KeyHelper.generateRegistrationId())
//     await bob.store.put('identityKey', KeyHelper.generateIdentityKeyPair())
//     await bob.store.put('registrationId', KeyHelper.generateRegistrationId())

//     //Create pre-keys for Bob
//     bob.preKey = await KeyHelper.generatePreKey(1)
//     bob.signedPreKey = await KeyHelper.generateSignedPreKey(await bob.store.getIdentityKeyPair(), 1)
//     bob.store.storePreKey(1, bob.preKey.keyPair);
//     bob.store.storeSignedPreKey(1, bob.signedPreKey.keyPair);

//     //Create pre-key bundle
//     bob.preKeyBundle = {
//         identityKey: (await bob.store.getIdentityKeyPair()).pubKey,
//         registrationId : await bob.store.getLocalRegistrationId(),
//         preKey:  {
//             keyId     : 1,
//             publicKey : bob.preKey.keyPair.pubKey
//         },
//         signedPreKey: {
//             keyId     : 1,
//             publicKey : bob.signedPreKey.keyPair.pubKey,
//             signature : bob.signedPreKey.signature
//         }
//     };

//     //Pretend to send pre-key bundle to Alice
//     //Create session
//     alice.session = new libsignal.SessionBuilder(alice.store, bob.address);
//     await alice.session.processPreKey(bob.preKeyBundle)

//     //
//     // FIRST MESSAGE
//     //
//     //Encrypt
//     alice.message = {}
//     alice.message.plainText = util.toArrayBuffer("my message ......");
//     alice.message.sessionCipher = new libsignal.SessionCipher(alice.store, bob.address);
//     alice.message.cipherText = await alice.message.sessionCipher.encrypt(alice.message.plainText)

//     //Decrypt
//     bob.message = {}
//     bob.message.sessionCipher = new libsignal.SessionCipher(bob.store, alice.address);
//     bob.message.plainText = util.toString(await bob.message.sessionCipher.decryptPreKeyWhisperMessage(alice.message.cipherText.body, 'binary'));
    
//     console.log(bob.message.plainText);

//     //
//     //Second Message
//     //
//     //Encrypt
//     bob.message.plainText = util.toArrayBuffer("another message ......");
//     bob.message.cipherText = await bob.message.sessionCipher.encrypt(bob.message.plainText)

//     //Decrypt
//     alice.message.plainText = util.toString(await alice.message.sessionCipher.decryptWhisperMessage(bob.message.cipherText.body, 'binary'));

//     console.log(alice.message.plainText)

//   }
  
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">A demonstration of the signal protocol</h1>
        </header>
        <Server />
      </div>
    );
  }
}

export default App;
