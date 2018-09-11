import React, { Component } from 'react';
import SignalProtocolStore from '../signalProtocolStore';

import './user.css';

const ByteBuffer = require("bytebuffer");
const libsignal = window.libsignal;
const KeyHelper = libsignal.KeyHelper;

export default class Server extends Component {

  state = {
    displayType: 'register', // alternatives: message
    userNameText: "", // Holds user name input content
    messageText: "", // Holds message input content
    recipient: undefined, // Holds selected recipient from options dropdown
    receivedMessages: [] // Array of recived message objects structure {sender: String, recipient: String, content: String}
  }

  sessions = {}
  signedPreKeyCreationDate = undefined
  address = undefined
  store = undefined
  preKeys = undefined
  signedPreKeyCreationDates = {}


  //Derives state when user is not a newUser or the available users change
  static getDerivedStateFromProps(props, state) {

    let newStateObject = {}

    //Appropriately change displayType
    if (props.userName !== "newUser") {
      newStateObject['displayType'] = "message";
    }

    //Ensure always appropriate recipient value
    if (props.availableUsers.length > 0) {
      if (state.recipient === undefined || props.availableUsers.indexOf(state.recipient) === -1) {
        newStateObject["recipient"]=props.availableUsers[0];
      }
    }

    return newStateObject
  }

  // Changes the username in state when the input changes
  handleUserNameTextChange = (e) => {
    this.setState({
      userNameText: e.target.value
    })
  }

  // Submits username to server
  handleUserNameSubmit = async (e) => {
    e.preventDefault();
    if (this.props.availableUsers.indexOf(this.state.userNameText) === -1) {

      //Create identity
      this.address = new libsignal.SignalProtocolAddress(this.state.userNameText, 1);
      this.store = new SignalProtocolStore();
      await this.store.put('identityKey', KeyHelper.generateIdentityKeyPair())
      await this.store.put('registrationId', KeyHelper.generateRegistrationId())

      //Create keys
      this.preKeys = []
      for (let i=1; i<10; i++) {
        this.preKeys.push(await KeyHelper.generatePreKey(i))
        this.store.storePreKey(i, this.preKeys.slice(-1)[0].keyPair);
      }
      const newSignedPreKeyId = Math.max(Object.keys(this.signedPreKeyCreationDates))+1
      this.signedPreKey = await KeyHelper.generateSignedPreKey(await this.store.getIdentityKeyPair(), newSignedPreKeyId)
      this.store.storeSignedPreKey(newSignedPreKeyId, this.signedPreKey.keyPair);
      this.signedPreKeyCreationDates[newSignedPreKeyId] = Date.now();

      //Send to server
      this.props.registerUserToServer(this.state.userNameText, {
        address: this.address.toString(),
        identityKey: util.toString((await this.store.getIdentityKeyPair()).pubKey),
        registrationId: await this.store.getLocalRegistrationId(),
        preKeys: this.preKeys.map((i) => {
          return {keyId: i.keyId, publicKey: util.toString(i.keyPair.pubKey)}
        }),
        signedPreKey: {keyId: newSignedPreKeyId, publicKey: util.toString(this.signedPreKey.keyPair.pubKey), signature: util.toString(this.signedPreKey.signature)}
      })

      this.setState({
        userNameText: undefined,
        displayType: 'message'
      })

    } else {
      alert("User already exists. Choose a new user name.")
    }
    
  }

  // Handles changes the selected recipient in the options box
  handleChangeSelectedRecipient = (e) => {
    this.setState({
      recipient: e.target.value
    })
  }

  // Handles changing the message text when the input changes
  handleMessageTextChange = (e) => {
    this.setState({
      messageText: e.target.value
    })
  }

  //Handles sending the message to the server
  handleSendMessage = async (e) => {
    e.preventDefault();

    const recipientPreKeyBundle = this.props.retrieveKeysforRecipient(this.state.recipient);
    recipientPreKeyBundle.address = new libsignal.SignalProtocolAddress.fromString(recipientPreKeyBundle.address)
    recipientPreKeyBundle.bundle.identityKey = util.toArrayBuffer(recipientPreKeyBundle.bundle.identityKey)
    recipientPreKeyBundle.bundle.preKey.publicKey =  util.toArrayBuffer(recipientPreKeyBundle.bundle.preKey.publicKey)
    recipientPreKeyBundle.bundle.signedPreKey.publicKey = util.toArrayBuffer(recipientPreKeyBundle.bundle.signedPreKey.publicKey)
    recipientPreKeyBundle.bundle.signedPreKey.signature = util.toArrayBuffer(recipientPreKeyBundle.bundle.signedPreKey.signature)

    if (!this.sessions[this.state.recipient]) {
      this.sessions[this.state.recipient] = new libsignal.SessionBuilder(this.store, recipientPreKeyBundle.address);
      await this.sessions[this.state.recipient].processPreKey(recipientPreKeyBundle.bundle)
    }

    const messageText = util.toArrayBuffer(this.state.messageText);
    const sessionCipher = new libsignal.SessionCipher(this.store, recipientPreKeyBundle.address);
    const messageObject = await sessionCipher.encrypt(messageText)

    let message = {
      sender: this.props.userName,
      senderAddress: this.address,
      recipient: this.state.recipient,
      content: messageObject
    }
    this.props.handleCommunicateMessage(message);
    this.handleUpdateIdentity();
  }

  //Handles receiving the message
  handleRecieveMessage = async (message) => {

    const sessionCipher = new libsignal.SessionCipher(this.store, message.senderAddress);
    if (message.content.type === 3) {
      this.sessions[message.sender] = {}
      message.content = util.toString(await sessionCipher.decryptPreKeyWhisperMessage(message.content.body, 'binary'));
    } else {
      message.content = util.toString(await sessionCipher.decryptWhisperMessage(message.content.body, 'binary'));
    }

    let newMessageArray = this.state.receivedMessages;
    newMessageArray.unshift(message);
    this.setState({receivedMessages: newMessageArray});

    this.handleUpdateIdentity();
  }

  handleUpdateIdentity = async () => {

    const {remainingPreKeys} = this.props.retrieveIdentityStatus(this.props.userName);

    console.log("Pre keys remaining for " + this.props.userId  + ": " + remainingPreKeys);
    
    if (remainingPreKeys < 5) {
      console.log("Creating new PreKeys");
      let newPreKeyArray = []
      for (let i=1; i<10; i++) {
        newPreKeyArray.push(await KeyHelper.generatePreKey(i))
        this.store.storePreKey(i, newPreKeyArray.slice(-1)[0].keyPair);
      }
      this.props.handleUpdatePreKeys(this.props.userName, newPreKeyArray);
    }

    //If identity greater than 5 mins old create new
    const mostRecentSignedPreKeyId = Math.max(Object.keys(this.signedPreKeyCreationDates))
    if (mostRecentSignedPreKeyId > 0 && this.signedPreKeyCreationDates[mostRecentSignedPreKeyId] < Date.now() - (1000*5)) {
      console.log("New Signed Pre Key");
      const newSignedPreKeyId = mostRecentSignedPreKeyId+1
      this.signedPreKey = await KeyHelper.generateSignedPreKey(await this.store.getIdentityKeyPair(), newSignedPreKeyId)
      this.store.storeSignedPreKey(newSignedPreKeyId, this.signedPreKey.keyPair);
      this.props.handleUpdateSignedPreKey(this.props.userName, {keyId: newSignedPreKeyId, publicKey: util.toString(this.signedPreKey.keyPair.pubKey), signature: util.toString(this.signedPreKey.signature)})
      this.signedPreKeyCreationDates[newSignedPreKeyId] = Date.now()
    }

    //Clean up expired signedPreKeys after 30s
    for (var i in this.signedPreKeyCreationDates) {
      if (this.signedPreKeyCreationDates[i] < Date.now() - (1000*30)) {
        console.log("Cleaning up expired signedPreKey");
        await this.store.removeSignedPreKey(i)
        delete this.signedPreKeyCreationDates[i]
      }
    }
 
  }

  render() {
    return (
      <div className="User">

        {/* Title */}
        <h4>{this.props.userName !== "newUser" ? this.props.userName : "New User"}</h4>

        {/* Registration Form */}
        {this.state.displayType === 'register' &&
          <form onSubmit={this.handleUserNameSubmit}>
            <input placeholder="User Name" value={this.state.userNameText} onChange={this.handleUserNameTextChange} />
            <button type="submit">Submit</button>
          </form>
        }

        {/* Message Sending Form */}
        {this.state.displayType === 'message' &&
          <div>

            {this.props.availableUsers.length === 0 && <p>No users available to send messages to. Add another user.</p>}

            {this.props.availableUsers.length >0 &&

              <div className="User-Content-Holder">
                <div className="User-Send-Message-Column">

                  <p>Send Message</p>

                  <form onSubmit={this.handleSendMessage}>
                    <select className="User-Recipient-Select" onChange={this.handleChangeSelectedRecipient}>
                      {this.props.availableUsers.map((o, i) => {
                        return <option value={o} key={i}>{o}</option>
                      })}
                    </select>
                    <input placeholder="Message" value={this.state.messageText} onChange={this.handleMessageTextChange} />
                    <button type="send">Submit</button>
                  </form>

                </div>
                <div className="User-Received-Messages-Column">

                  <p>Received Messages</p>
                  {this.state.receivedMessages.map((o, i) => {
                    return <div className="User-Received-Message" key={i}>
                      <p>{o.sender}: {o.content}</p>
                    </div>
                  })}

                </div>
              </div>
              
            }
          </div>
        }


      </div>
    );
  }
}

var util = (function() {

  var StaticArrayBufferProto = new ArrayBuffer().__proto__;

  return {
      toString: function(thing) {
          if (typeof thing === 'string') {
              return thing;
          }
          return new ByteBuffer.wrap(thing).toString('binary');
      },
      toArrayBuffer: function(thing) {
          if (thing === undefined) {
              return undefined;
          }
          if (thing === Object(thing)) {
              if (thing.__proto__ === StaticArrayBufferProto) {
                  return thing;
              }
          }

          // eslint-disable-next-line
          var str;
          if (typeof thing === "string") {
              str = thing;
          } else {
              throw new Error("Tried to convert a non-string of type " + typeof thing + " to an array buffer");
          }
          return new ByteBuffer.wrap(thing, 'binary').toArrayBuffer();
      },
      isEqual: function(a, b) {
          // TODO: Special-case arraybuffers, etc
          if (a === undefined || b === undefined) {
              return false;
          }
          a = util.toString(a);
          b = util.toString(b);
          var maxLength = Math.max(a.length, b.length);
          if (maxLength < 5) {
              throw new Error("a/b compare too short");
          }
          return a.substring(0, Math.min(maxLength, a.length)) === b.substring(0, Math.min(maxLength, b.length));
      }
  };
})();