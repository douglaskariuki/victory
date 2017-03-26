import { toPairs, groupBy, forOwn } from "lodash";
import { VictoryContainer } from "victory-core";

const ensureArray = (thing) => {
  if (!thing) {
    return [];
  } else if (!Array.isArray(thing)) {
    return [thing];
  } else {
    return thing;
  }
};

const combineEventHandlers = (eventHandlersArray) => {
  // takes an array of event handler objects and produces one eventHandlers object
  // creates a custom combinedHandler() for events with multiple conflicting handlers
  return eventHandlersArray.reduce((localHandlers, finalHandlers) => {
    forOwn(localHandlers, (localHandler, eventName) => {
      const existingHandler = finalHandlers[eventName];
      if (existingHandler) {
        // create new handler for event that concats the existing handler's mutations with new ones
        finalHandlers[eventName] = function combinedHandler(...params) { // named for debug clarity
          // sometimes handlers return undefined; use empty array instead, for concat()
          const existingMutations = ensureArray(existingHandler(...params));
          const localMutations = ensureArray(localHandler(...params));
          return existingMutations.concat(localMutations);
        };
      } else {
        finalHandlers[eventName] = localHandler;
      }
    });
    return finalHandlers;
  });
};

const combineDefaultEvents = (defaultEvents) => {
  // takes a defaultEvents array and returns one equal or lesser length,
  // by combining any events that have the same target
  const eventsByTarget = groupBy(defaultEvents, "target");
  return toPairs(eventsByTarget).map(
    ([target, eventsArray]) => {
      return {
        target,
        eventHandlers: combineEventHandlers(eventsArray.map((event) => event.eventHandlers))
        // note: does not currently handle eventKey or childName
      };
    }
  );
};

export const combineContainerMixins = (mixinA, mixinB, displayName = "CustomVictoryContainer") => {
  // similar to Object.assign(A, B), this function will decide conflicts in favor mixinB.
  // this applies to propTypes and defaultProps.
  // getChildren will call A's getChildren() and pass the resulting children to B's.
  // defaultEvents attempts to resolve any conflicts between A and B's defaultEvents.

  const ClassA = mixinA(VictoryContainer);
  const ClassB = mixinB(VictoryContainer);
  const instanceA = new ClassA();
  const instanceB = new ClassB();

  const NaiveCombinedContainer = mixinA(mixinB(VictoryContainer));
  return class VictoryCombinedContainer extends NaiveCombinedContainer {
    static displayName = displayName;

    static propTypes = {
      ...ClassA.propTypes,
      ...ClassB.propTypes
    };

    static defaultProps = {
      ...ClassA.defaultProps,
      ...ClassB.defaultProps
    };

    static defaultEvents = combineDefaultEvents([...ClassA.defaultEvents, ...ClassB.defaultEvents]);

    getChildren(props) {
      const children = instanceA.getChildren.call(this, props);
      return instanceB.getChildren.call(this, {...props, children});
    }
  };
};
