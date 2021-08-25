import React from "react";
import { View, Platform, Button, KeyboardAvoidingView } from "react-native";
import AsyncStorage from "@react-native-community/async-storage";
import NetInfo from '@react-native-community/netinfo';

const firebase = require("firebase");
require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyASaZho3f5xkW6LF6415NtoUZwGSBLNKKg",
  authDomain: "chat-app-cedf3.firebaseapp.com",
  projectId: "chat-app-cedf3",
  storageBucket: "chat-app-cedf3.appspot.com",
  messagingSenderId: "416532966096",
  appId: "1:416532966096:web:8070b549943c9454e70cd5",
  measurementId: "G-VJEPJLKFD7"
};

import { GiftedChat, Bubble, InputToolbar } from "react-native-gifted-chat";

export default class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      uid: 0,
      loggedInText: "Logging in...",
      user: {
        _id: "",
        name: "",
      },
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    this.referenceChatMessages = firebase.firestore().collection("messages");
    this.referenceMessageUser = null;
  }

  async getMessages() {
    let messages = "";
    try {
      messages = (await AsyncStorage.getItem("messages")) || [];
      this.setState({
        messages: JSON.parse(messages),
      });
    } catch (error) {
      console.log(error.message);
    }
  }

  async saveMessage() {
    try {
      await AsyncStorage.setItem(
        "messages",
        JSON.stringyfy(this.state.messages)
      );
    } catch (error) {
      console.log(error.message);
    }
  }

  async deleteMessages() {
    try {
      await AsyncStorage.removeItem("messages");
      this.setState({
        messages: [],
      });
    } catch (error) {
      console.log(error.message);
    }
  }

  addMessage() {
    const message = this.state.messages[0];
    // add the new messages to the collection
    this.referenceChatMessages.add({
      uid: this.state.uid,
      _id: message._id,
      text: message.text,
      createdAt: message.createdAt,
      user: message.user,
    });
  }

  onSend(messages = []) {
    this.setState(
      (previousState) => ({
        messages: GiftedChat.append(previousState.messages, messages),
      }),
      () => {
        this.saveMessage();
        this.addMessage();
      }
    );
  }

  onCollectionUpdate = (querySnapshot) => {
    const messages = [];
    // go through each document
    querySnapshot.forEach((doc) => {
      // get the QueryDocumentSnapshot's data
      let data = doc.data();
      messages.push({
        _id: data._id,
        text: data.text,
        createdAt: data.createdAt.toDate(),
        user: {
          _id: data.user._id,
          name: data.user.name,
        },
      });
    });
    this.setState({
      messages,
    });
  };

  //prevents any input if a user is offline
  renderInputToolbar(props) {
    if (this.state.isConnected == false) {
    } else {
      return(
        <InputToolbar
        {...props}
        />
      );
    }
  }

  renderBubble(props) {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: "#000",
            // Background color for my own chat window. Could be adjusted to fit the color concept to a greenish tone
          },
        }}
      />
    );
  }

  componentDidMount() {
    const name = this.props.route.params.username;
    this.props.navigation.setOptions({ title: name });

    //check if user is online or offline
    NetInfo.fetch().then(connection => {
      if (connection.isConnected) {
        console.log('online');
      } else {
        console.log('offline');
      }
    });

    this.getMessages();

    this.authUnsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        firebase.auth().signInAnonymously();
      }
      this.setState({
        uid: user.uid,
        messages: [],
        user: {
          _id: user.uid,
          name: name,
        },
      });
      this.referenceMessagesUser = firebase
        .firestore()
        .collection("messages")
        .where("uid", "==", this.state.uid);

      this.unsubscribe = this.referenceChatMessages
        .orderBy("createdAt", "desc")
        .onSnapshot(this.onCollectionUpdate);
    });
  }

  componentWillUnmount() {
    // stop authentication
    this.authUnsubscribe();
  }

  render() {
    return (
      <View
        style={{
          flex: 1,

          backgroundColor: this.props.route.params.backgroundColor,
        }}
      >
        <GiftedChat
          renderInputToolbar={this.renderInputToolbar}
          messages={this.state.messages}
          renderBubble={this.renderBubble.bind(this)}
          messages={this.state.messages}
          onSend={(messages) => this.onSend(messages)}
          user={this.state.user}
        />
        {Platform.OS === "android" ? (
          <KeyboardAvoidingView behaviour="height" />
        ) : null}
        {/* This part is important for Issues with Android Keyboard covering Chat window */}
      </View>
      // </View>
    );
  }
}