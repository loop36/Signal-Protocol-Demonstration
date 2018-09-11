import React, { Component } from 'react';
import './server.css';

import User from '../User/user';

export default class Server extends Component {

  state = {
    users: {},
    messageText: undefined
  }

  handleAddUser = (e) => {
    e.preventDefault();
    if (!this.state.users.newUser) {
      this.setState({
        users: Object.assign(this.state.users, {newUser: {}})
      })
    }
  }

  handleRegisterUser = (userName, identityBundle) => {
    let newUserObject = this.state.users
    newUserObject[userName] = Object.assign(newUserObject.newUser, identityBundle)
    delete newUserObject.newUser
    this.setState({users: newUserObject})
  }

  handleSupplyKeyBundle = (recipientUserName) => {
    const preKeyToReturn = this.state.users[recipientUserName].preKeys.shift();
    this.setState({users: this.state.users})

    return {
      address: this.state.users[recipientUserName].address,
      bundle: {
        identityKey: this.state.users[recipientUserName].identityKey,
        registrationId : this.state.users[recipientUserName].registrationId,
        preKey:  preKeyToReturn,
        signedPreKey: this.state.users[recipientUserName].signedPreKey
      }
    }
  }

  handleUpdatePreKeys = (username, preKeyArray) => {
    preKeyArray.forEach((i) => {
      this.state.users[username].preKeys.push(i)
    })
    this.setState({users: this.state.users})
  }

  handleUpdateSignedPreKey = (username, signedPreKey) => {
    const newUsersObject = this.state.users
    newUsersObject[username].signedPreKey = signedPreKey
    this.setState({users: newUsersObject})
  }

  handleReturnIdentityStatus = (username) => {
    return {
      remainingPreKeys: this.state.users[username].preKeys.length
    }
  }

  handleCommunicateMessage = (message) => {
    this.state.users[message.recipient].ref.handleRecieveMessage(message);
    //below just handles displaying the message
    this.setState({messageText: message.content.body.substring(message.content.body.length-20, message.content.body.length)})
    if (this.timeout) {clearTimeout(this.timeout)}
    this.timeout = setTimeout(() => {
      this.setState({messageText: undefined})
      this.timeout = undefined
    }, 2000)
  }

  render() {
    return (
      <div className="Server">
        <div className="Server-Header">
          <h3 className="Server-Title">Server</h3>
          {this.state.messageText && <p className="Server-Message">Message Seen: ...{this.state.messageText}</p>}
          <button className="Server-Add-User-Button" onClick={this.handleAddUser}>Add User</button>
        </div>
        <div className="Server-User-Holder">
          {Object.keys(this.state.users).map((o, i ) => {
            return <User
              key={i} 
              userName={o}
              ref={(ref) => {
                if (this.state.users[o] && !this.state.users[o].ref) {
                  let newUserObject = this.state.users;
                  newUserObject[o].ref = ref;
                  this.setState({users: newUserObject})
                }
              }}
              availableUsers={Object.keys(this.state.users).filter(p => p !== o && p !== "newUser")}
              registerUserToServer={this.handleRegisterUser}
              retrieveKeysforRecipient={this.handleSupplyKeyBundle}
              handleCommunicateMessage={this.handleCommunicateMessage}
              retrieveIdentityStatus={this.handleReturnIdentityStatus}
              handleUpdatePreKeys={this.handleUpdatePreKeys}
              handleUpdateSignedPreKey={this.handleUpdateSignedPreKey}
              />
          })}
        </div>
      </div>
    );
  }

}