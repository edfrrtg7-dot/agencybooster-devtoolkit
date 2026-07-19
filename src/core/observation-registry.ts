import type { Observation } from "./observation-types";
import { EventBus, Events } from "./event-bus";

export class ObservationRegistry {
  private observations = new Map<string, Observation>();

  constructor(private readonly eventBus: EventBus) {}

  add(observation: Observation): void {
    this.observations.set(observation.id, Object.freeze(observation) as Observation);
  }

  remove(id: string): boolean {
    const existed = this.observations.delete(id);
    if (existed) {
      this.eventBus.emit(Events.ObservationRemoved, { id });
    }
    return existed;
  }

  get(id: string): Observation | undefined {
    return this.observations.get(id);
  }

  getAll(): readonly Observation[] {
    return Array.from(this.observations.values());
  }

  count(): number {
    return this.observations.size;
  }

  clear(): void {
    this.observations.clear();
    this.eventBus.emit(Events.RegistryCleared, {});
  }
}
