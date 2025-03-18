import React from "react";

function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: "block", margin: "10px 0" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ marginRight: "8px" }}
      />
      {label}
    </label>
  );
}

export default Checkbox;