import { NativeModule, requireNativeModule } from 'expo';

declare class MyModule extends NativeModule {
  hello(): string;
}

export default requireNativeModule<MyModule>('MyModule');
