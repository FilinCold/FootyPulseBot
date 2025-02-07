class TariffStore {
  constructor() {
    this._tariff = "";
  }

  set tariff(commandTariff) {
    this._tariff = commandTariff;
  }

  get tariff() {
    return this._tariff;
  }
}

export const tariffStore = new TariffStore();
