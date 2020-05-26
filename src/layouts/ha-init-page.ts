import "@material/mwc-button";
import "@polymer/paper-spinner/paper-spinner-lite";
import { css, CSSResult, html, LitElement, property } from "lit-element";
import { removeInitSkeleton } from "../util/init-skeleton";
import "@polymer/paper-input/paper-input";

class HaInitPage extends LitElement {
  @property({ type: Boolean }) public error = false;

  protected render() {
    return html`
      <div>
        <img src="/static/icons/favicon-192x192.png" height="192" />
        ${this.error
          ? html`
              <p>Unable to connect to Home Assistant.</p>
              <mwc-button @click=${this._retry}>Retry</mwc-button>
              <paper-input label="Key" id="token"></paper-input>
              <mwc-button @click=${this._submit}>submit</mwc-button>
              ${location.host.includes("ui.nabu.casa")
                ? html`
                    <p>
                      It is possible that you are seeing this screen because
                      your Home Assistant is not currently connected. You can
                      ask it to come online via
                      <a href="https://remote.nabucasa.com/"
                        >the Remote UI portal</a
                      >.
                    </p>
                  `
                : ""}
            `
          : html`
              <paper-spinner-lite active></paper-spinner-lite>
              <p>Loading data</p>
            `}
      </div>
    `;
  }

  protected firstUpdated() {
    removeInitSkeleton();
  }

  private _retry() {
    location.reload();
  }

  private _submit() {
    let token = this.shadowRoot!.getElementById("token").value;
    console.log(token);
    if (!token) return;
    fetch("/api/activation", {
      method: "POST",
      headers: {
        ["Content-Type"]: "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        code: token,
      }),
    })
      .then((res) => {
        if (res.status !== 200) {
          console.log(res);
          throw new Error("Not 200 response");
        }
        console.log(res);
        this._retry();
      })
      .catch((err) => {
        console.error(err);
      });
  }

  static get styles(): CSSResult {
    return css`
      div {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      paper-spinner-lite {
        margin-top: 9px;
      }
      a {
        color: var(--primary-color);
      }
      p {
        max-width: 350px;
      }
    `;
  }
}

customElements.define("ha-init-page", HaInitPage);
