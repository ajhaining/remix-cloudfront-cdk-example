import { useEffect, useRef } from "react";
import type { ActionFunction } from "remix";
import { hash } from "~/utils.server";
import { Form, json, useActionData, useTransition, redirect } from "remix";

export function meta() {
  return { title: "Actions Demo" };
}

// When your form sends a POST, the action is called on the server.
// - https://remix.run/api/conventions#action
// - https://remix.run/guides/data-updates
export let action: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  let answer = formData.get("answer");

  // Typical action workflows start with validating the form data that just came
  // over the network. Clientside validation is fine, but you definitely need it
  // server side.  If there's a problem, return the the data and the component
  // can render it.
  if (typeof answer !== "string") {
    return json("Come on, at least try!", { status: 400 });
  }

  let rightAnswers = [
    "4fa6024f12494d3a99d8bda9b7a55f7d140f328a",
    "ce3659ad235ca6d1e12dec21465aff3f9a62bb8c",
    "bd111dcb4b343de4ec0a79d2d5ec55a3919c79c4",
  ];

  let encrypted = hash(answer);

  if (!rightAnswers.includes(encrypted)) {
    return json(`Sorry, ${answer} is not right.`, { status: 400 });
  }

  // Finally, if the data is valid, you'll typically write to a database or send or
  // email or log the user in, etc. It's recommended to redirect after a
  // successful action, even if it's to the same place so that non-JavaScript workflows
  // from the browser doesn't repost the data if the user clicks back.
  return redirect("/demos/correct");
};

export default function ActionsDemo() {
  // https://remix.run/api/remix#useactiondata
  let actionMessage = useActionData<string>();
  let answerRef = useRef<HTMLInputElement>(null);

  // This form works without JavaScript, but when we have JavaScript we can make
  // the experience better by selecting the input on wrong answers! Go ahead, disable
  // JavaScript in your browser and see what happens.
  useEffect(() => {
    if (actionMessage && answerRef.current) {
      answerRef.current.select();
    }
  }, [actionMessage]);

  return (
    <div className="remix__page">
      <main>
        <h2>Actions!</h2>
        <p>
          This form submission will send a post request that we handle in our
          `action` export. Any route can export an action to handle data
          mutations.
        </p>
        <Form method="post" className="remix__form">
          <h3>Post an Action</h3>
          <p>
            <i>What is more useful when it is broken?</i>
          </p>
          <label>
            <div>Answer:</div>
            <input ref={answerRef} name="answer" type="text" />
          </label>
          <div>
            <button>Answer!</button>
          </div>
          {actionMessage ? (
            <p>
              <b>{actionMessage}</b>
            </p>
          ) : null}
        </Form>
      </main>

      <aside>
        <h3>Additional Resources</h3>
        <ul>
          <li>
            Guide:{" "}
            <a href="https://remix.run/guides/data-writes">Data Writes</a>
          </li>
          <li>
            API:{" "}
            <a href="https://remix.run/api/conventions#action">
              Route Action Export
            </a>
          </li>
          <li>
            API:{" "}
            <a href="https://remix.run/api/remix#useactiondata">
              <code>useActionData</code>
            </a>
          </li>
        </ul>
      </aside>
    </div>
  );
}
