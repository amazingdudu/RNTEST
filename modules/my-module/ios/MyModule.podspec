Pod::Spec.new do |s|
  s.name = 'MyModule'
  s.version = '1.0.0'
  s.summary = 'Local native greeting module'
  s.description = 'Exposes a native greeting to TypeScript.'
  s.license = { :type => 'MIT' }
  s.author = 'RNTEST'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
