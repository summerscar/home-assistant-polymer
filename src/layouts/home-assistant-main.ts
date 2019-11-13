import {
  LitElement,
  html,
  TemplateResult,
  CSSResult,
  css,
  PropertyValues,
  property,
} from "lit-element";
import "@polymer/app-layout/app-drawer-layout/app-drawer-layout";
import "@polymer/app-layout/app-drawer/app-drawer";
// Not a duplicate, it's for typing
// tslint:disable-next-line
import { AppDrawerElement } from "@polymer/app-layout/app-drawer/app-drawer";
import "@polymer/iron-media-query/iron-media-query";

import "./partial-panel-resolver";
import { HomeAssistant, Route } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { PolymerChangedEvent } from "../polymer-types";
// tslint:disable-next-line: no-duplicate-imports
import { AppDrawerLayoutElement } from "@polymer/app-layout/app-drawer-layout/app-drawer-layout";
import { showNotificationDrawer } from "../dialogs/notifications/show-notification-drawer";
import { toggleAttribute } from "../common/dom/toggle_attribute";
import "@vaadin/vaadin-notification/vaadin-notification.js";
import { getConfigEntries, ConfigEntry } from "../data/config_entries";
import {
  subscribeDeviceRegistry,
  DeviceRegistryEntry,
} from "../data/device_registry";
import "@polymer/paper-dialog/paper-dialog.js";
import "@material/mwc-button";
import "@polymer/paper-input/paper-input.js";

const NON_SWIPABLE_PANELS = ["kiosk", "map"];

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-toggle-menu": undefined;
    "hass-show-notifications": undefined;
  }
}

class HomeAssistantMain extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public route?: Route;
  @property({ type: Boolean }) private narrow?: boolean;

  private mqttDevices: DeviceRegistryEntry[];
  protected render(): TemplateResult | void {
    const hass = this.hass;

    if (!hass) {
      return;
    }

    const sidebarNarrow = this._sidebarNarrow;

    const disableSwipe =
      !sidebarNarrow || NON_SWIPABLE_PANELS.indexOf(hass.panelUrl) !== -1;

    return html`
      <iron-media-query
        query="(max-width: 870px)"
        @query-matches-changed=${this._narrowChanged}
      ></iron-media-query>

      <app-drawer-layout
        fullbleed
        .forceNarrow=${sidebarNarrow}
        responsive-width="0"
      >
        <app-drawer
          id="drawer"
          align="start"
          slot="drawer"
          .disableSwipe=${disableSwipe}
          .swipeOpen=${!disableSwipe}
          .persistent=${!this.narrow &&
            this.hass.dockedSidebar !== "always_hidden"}
        >
          <ha-sidebar
            .hass=${hass}
            .narrow=${sidebarNarrow}
            .alwaysExpand=${sidebarNarrow ||
              this.hass.dockedSidebar === "docked"}
          ></ha-sidebar>
        </app-drawer>

        <partial-panel-resolver
          .narrow=${this.narrow}
          .hass=${hass}
          .route=${this.route}
        ></partial-panel-resolver>
        <vaadin-notification duration="4000" id="notification">
          <template>
            <div>
              <b>Notice</b>
              <br />
              The content of this notification is defined with Polymer template
            </div>
          </template>
        </vaadin-notification>
        <paper-dialog id="regeister">
          <h2>Key</h2>
          <paper-input id="token"></paper-input>
          <div class="buttons">
            <mwc-button label="Cancel" dialog-dismiss></mwc-button>
            <mwc-button
              label="OK"
              dialog-confirm
              @click=${this.submitCode}
            ></mwc-button>
          </div>
        </paper-dialog>
      </app-drawer-layout>
    `;
  }

  protected firstUpdated() {
    import(/* webpackChunkName: "ha-sidebar" */ "../components/ha-sidebar");

    this.addEventListener("hass-toggle-menu", () => {
      if (this._sidebarNarrow) {
        if (this.drawer.opened) {
          this.drawer.close();
        } else {
          this.drawer.open();
        }
      } else {
        fireEvent(this, "hass-dock-sidebar", {
          dock: this.hass.dockedSidebar === "auto" ? "docked" : "auto",
        });
        setTimeout(() => this.appLayout.resetLayout());
      }
    });

    this.addEventListener("hass-show-notifications", () => {
      showNotificationDrawer(this, {
        narrow: this.narrow!,
      });
    });
    window.notification = this.shadowRoot!.getElementById("notification"); // tslint:disable-line
    const regeister = this.shadowRoot!.getElementById("regeister"); // tslint:disable-line
    // need to check if regeisted
    regeister.open(); // tslint:disable-line
    // window.notification.open(); // tslint:disable-line

    this.subscribeMqtt();
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    toggleAttribute(
      this,
      "expanded",
      this.narrow || this.hass.dockedSidebar !== "auto"
    );

    if (changedProps.has("route") && this._sidebarNarrow) {
      this.drawer.close();
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    // Make app-drawer adjust to a potential LTR/RTL change
    if (oldHass && oldHass.language !== this.hass!.language) {
      this.drawer._resetPosition();
    }
  }

  private async subscribeMqtt() {
    const entries = await getConfigEntries(this.hass!);
    const mqttEntry: ConfigEntry | undefined = entries.find(
      (entry) => entry.domain === "mqtt"
    );
    console.log("mqtt", mqttEntry);

    if (mqttEntry) {
      subscribeDeviceRegistry(this.hass.connection, (devices) => {
        const mqttDevices = devices.filter((device) =>
          device.config_entries.includes(mqttEntry.entry_id)
        );

        if (this.mqttDevices) {
          const newDevice = mqttDevices.filter((mqttDevice) => {
            return this.mqttDevices
              .map((item) => item.id)
              .includes(mqttDevice.id);
          });
          if (newDevice.length) {
            console.log("new mqttdevice:", newDevice);
          }
        }

        this.mqttDevices = mqttDevices;
        console.log("mqttDevices", mqttDevices);
      });
    }
  }

  private submitCode() {
    const token = this.shadowRoot!.getElementById("token").value; // tslint:disable-line
    if (!token) return;
    this.hass
      .callApi("POST", "activation/", {
        code: token,
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  private _narrowChanged(ev: PolymerChangedEvent<boolean>) {
    this.narrow = ev.detail.value;
  }

  private get _sidebarNarrow() {
    return this.narrow || this.hass.dockedSidebar === "always_hidden";
  }

  private get drawer(): AppDrawerElement {
    return this.shadowRoot!.querySelector("app-drawer")!;
  }

  private get appLayout(): AppDrawerLayoutElement {
    return this.shadowRoot!.querySelector("app-drawer-layout")!;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        color: var(--primary-text-color);
        /* remove the grey tap highlights in iOS on the fullscreen touch targets */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        --app-drawer-width: 64px;
      }
      :host([expanded]) {
        --app-drawer-width: 256px;
      }
      partial-panel-resolver,
      ha-sidebar {
        /* allow a light tap highlight on the actual interface elements  */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      }
      partial-panel-resolver {
        height: 100%;
      }
    `;
  }
}

customElements.define("home-assistant-main", HomeAssistantMain);
