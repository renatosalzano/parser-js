const declarators = {
  interface: { type: 'InterfaceDeclaration' },
  type: { type: 'TypeAliasDeclaration' },
  enum: { type: 'EnumDeclaration' },
  namespace: { type: 'NamespaceDeclaration' },
  module: { type: 'ModuleDeclaration' }
};

const keywords = {
  declare: { type: 'DeclareKeyword' },
  abstract: { type: 'AbstractKeyword' },
  readonly: { type: 'ReadonlyKeyword' },
  public: { type: 'PublicKeyword' },
  private: { type: 'PrivateKeyword' },
  protected: { type: 'ProtectedKeyword' },
  static: { type: 'StaticKeyword' },
  get: { type: 'GetAccessor' },
  set: { type: 'SetAccessor' }
};
