import React from "react";
import TripChatModal from "../chat/TripChatModal";

export default function OperatorMessageModal(props) {
  return <TripChatModal {...props} currentRole="operator" />;
}
