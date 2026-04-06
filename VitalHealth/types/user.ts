export interface UserProfile {
  personal: {
    name: string
    email: string
    phone: string
    dob: string
    gender: string
  }

  medical: {
    height: number
    weight: number
    bloodGroup: string
    allergies: string
    medications: string
  }

  habits: {
    wakeUp: string
    breakfast: string
    lunch: string
    dinner: string
    sleep: string
    water: number
    activity: string
  }

  history: {
    diseases: string
    surgeries: string
    familyHistory: string
  }

  emergency: {
    name: string
    phone: string
  }[]
}