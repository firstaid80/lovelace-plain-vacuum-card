((LitElement) => {
    console.info(
        '%c Plain-Vacuum-Card %c 1.1 ',
        'color: black; background: Chartreuse; font-weight: bold;',
        'color: black; background: white; font-weight: bold;',
    );
	
	const translateState = {
		de: {
			cleaning: "Reinigen",
			spot: "Spot Reinigen",
			paused: "Pausiert",
			idle: "Untätig",
			stop: "Angehalten",
			charging: "Aufladen",
			"returning home": "Rückkehr zu Dockingstation",
			returning: "Rückkehr zu Dockingstation",
			docked: "Angedockt",
			unknown: "Unbekannt",
			offline: "Offline",
			error: "Fehler",
			bin_full: "Behälter Voll"
		},
		en: {
			cleaning: "Cleaning",
			spot: "Spot Cleaning",
			paused: "Paused",
			idle: "Idle",
			stop: "Stopped",
			charging: "Charging",
			"returning home": "Returning Home",
			returning: "Returning Home",
			docked: "Docked",
			unknown: "Unknown",
			offline: "Offline",
			error: "Error",
			bin_full: "Bin Full"
		},
		get: function(state, lang) {
			if (typeof this[lang] !== 'undefined') {
				if (typeof this[lang][state] !== 'undefined') {
					return this[lang][state];
				} else {
					return "TRANSLATE " + state;
				}
			} else {
				return "Wrong language";
			}
		}
	}

    const buttons = {
        start: {
            label: 'Start',
            icon: 'mdi:play',
            service: 'vacuum.start',
        },
        pause: {
            label: 'Pause',
            icon: 'mdi:pause',
            service: 'vacuum.pause',
        },
        stop: {
            label: 'Stop',
            icon: 'mdi:stop',
            service: 'vacuum.stop',
        },
        locate: {
            label: 'Locate',
            icon: 'mdi:map-marker',
            service: 'vacuum.locate',
        },
        return: {
            label: 'Return to Base',
            icon: 'mdi:home-map-marker',
            service: 'vacuum.return_to_base',
        },
    };

    const html = LitElement.prototype.html;
    const css = LitElement.prototype.css;

    class PlainVacuumCard extends LitElement {

        static get properties() {
            return {
                _hass: {},
                config: {},
                stateObj: {},
            }
        }

        static get styles() {
            return css`

.title {
  font-size: 20px;
  padding: 12px 16px 8px;
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.header {
  padding: 20px 20px 0 20px;
  display: flex;
  justify-content: space-between;  
  font-weight: 500;
  font-size: 16px;
}
.buttons {
  padding: 0 20px  20px;
  display: flex;
  justify-content: space-between;  
}
.flex {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
}
.error {
  color: var(--error-state-color, var(--error-color));
  font-weight: 500;
  font-size: 16px;
  display: flex;
  justify-content: space-around;
}`;
        }

        render() {
            return this.stateObj ? html`
            <ha-card>
              <div class="header">${this.renderStatus()}</div>
              <div class="title">${this.stateObj.attributes.friendly_name}</div>
			  <div class="controls">${this.renderControls()}</div>
            </ha-card>` : html`<ha-card style="padding: 8px 16px">Entity '${this.config.entity}' not available...</ha-card>`;
        }
		
		renderStatus() {			
			return html`
				<div class="state">
					${translateState.get(this._hass.states[this.config.entity]['state'],"de")}
				</div>
				<div class="space"></div>
				<div class="battery">
					${this._hass.states[this.config.sensorEntity + '_battery_level']['state']}${this._hass.states[this.config.sensorEntity + '_battery_level']['attributes']['unit_of_measurement']}
					<ha-icon icon="${this._hass.states[this.config.sensorEntity + '_battery_level']['attributes']['icon']}"></ha-icon>
				</div>`;
		}
		
		renderControls() {
			return html` 
			${ this._hass.states[this.config.entity]['attributes']['bin_full'] ? html` <div class="error"><div> ${translateState.get('bin_full',"de")}</div></div>`: null}
			<div class="buttons"><div class="space"></div>
            ${ ["docked", "paused", "stop", "idle"].includes(this._hass.states[this.config.entity]['state']) && !this._hass.states[this.config.entity]['attributes']['bin_full'] ? this.renderButton('start') : null}
            ${ ["cleaning", "returning"].includes(this._hass.states[this.config.entity]['state']) ? this.renderButton('pause') : null}
            ${ ["cleaning", "paused", "returning"].includes(this._hass.states[this.config.entity]['state']) ? this.renderButton('stop') : null}
            ${ this.renderButton('locate')}
            ${ ["cleaning", "paused", "stop", "idle"].includes(this._hass.states[this.config.entity]['state']) ? this.renderButton('return') : null}
            <div class="space"></div></div>			
			`;
        }	
		
        renderButton(button) {
            return 	html`
					<ha-icon-button @click="${() => this.callService(buttons[button]['service'])}"
						title="Start"
						style="var(--paper-item-icon-color)">
					  <ha-icon style="display:flex;" icon="${buttons[button]['icon']}"></ha-icon>
					</ha-icon-button>
			`
        }

        shouldUpdate(changedProps) {
            return changedProps.has('stateObj');
        }

        setConfig(config) {
            if (!config.entity) throw new Error('Please define an entity.');
            if (config.entity.split('.')[0] !== 'vacuum') throw new Error('Please define a vacuum entity.');

            this.config = {
                entity: config.entity,
                sensorEntity: `sensor.${config.entity.split('.')[1]}`,
            };
        }

        set hass(hass) {
            if (hass && this.config) {
                this.stateObj = this.config.entity in hass.states ? hass.states[this.config.entity] : null;
            }
            this._hass = hass;
        }

        handleChange(e, key, service) {
            const mode = e.target.getAttribute('value');
            this.callService(service || `vacuum.set_${key}`, {entity_id: this.stateObj.entity_id, [key]: mode});
        }

        callService(service, data = {entity_id: this.stateObj.entity_id}) {
            const [domain, name] = service.split('.');
            this._hass.callService(domain, name, data);
        }

        fireEvent(type, options = {}) {
            const event = new Event(type, {
                bubbles: options.bubbles || true,
                cancelable: options.cancelable || true,
                composed: options.composed || true,
            });
            event.detail = {entityId: this.stateObj.entity_id};
            this.dispatchEvent(event);
        }

        deepMerge(...sources) {
            const isObject = (obj) => obj && typeof obj === 'object';
            const target = {};

            sources.filter(source => isObject(source)).forEach(source => {
                Object.keys(source).forEach(key => {
                    const targetValue = target[key];
                    const sourceValue = source[key];

                    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                        target[key] = targetValue.concat(sourceValue);
                    } else if (isObject(targetValue) && isObject(sourceValue)) {
                        target[key] = this.deepMerge(Object.assign({}, targetValue), sourceValue);
                    } else {
                        target[key] = sourceValue;
                    }
                });
            });

            return target;
        }
    }

    customElements.define('plain-vacuum-card', PlainVacuumCard);
})(window.LitElement || Object.getPrototypeOf(customElements.get("hui-masonry-view") || customElements.get("hui-view")));