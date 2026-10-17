export abstract class EntityBase {
  id?: string;
  createdAt?: Date | string;
  createdBy?: string = null;
  isActive?: boolean = true;


  protected constructor(data?: Partial<EntityBase>) {
    if (data) {
      Object.assign(this, data);
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {

          this.createdAt = new Date(data.createdAt);


        } else {
          this.createdAt = data.createdAt;
        }
      }
    }
  }

  validate(): boolean {
    // TODO: Implement basic validation logic
    return true
  }

  toJSON(): any {
    const obj: any = {};
    Object.keys(this).forEach(key => {
      obj[key] = this[key];
    });
    return obj;
  }

  fromJSON(json: any): this {
    Object.keys(json).forEach(key => {
      this[key] = json[key];
    });
    if (json.CreatedAt) {
      this.createdAt = new Date(json.CreatedAt);
    }
    return this;
  }
}
