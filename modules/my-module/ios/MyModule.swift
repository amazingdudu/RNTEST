import ExpoModulesCore

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")

    Function("hello") {
      "Hello from iOS"
    }
  }
}
