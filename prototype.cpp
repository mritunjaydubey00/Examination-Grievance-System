#include <iostream>
#include <string>

using namespace std;

const int number_of_departments = 5;
const int number_of_designations = 5;

string departments[number_of_departments] = {"Computer Science", "Mathematics", "Physics", "Chemistry", "Biology"};
string designations[number_of_designations] = {"Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Instructor"};

// Renamed structs to avoid collision with function names
struct FacultyName {
    string first_name;
    string last_name;
};

struct DateOfBirth {
    int day;
    int month;
    int year;
};

class faculty {
    private:
        string password;
        faculty* next;
        faculty* prev;
    protected:
        string department;
        string designation;
        DateOfBirth date_of_birth;
        long int phone_number;
    public:
        FacultyName faculty_name;
        int ID;
        string fEmail;

        faculty(string fname, string lname) {
            faculty_name.first_name = fname;
            faculty_name.last_name = lname;
            
            // Sequential registration flow
            email(0);
            phone(0);
            dobFunction(0);
            departmentFunction(0);
            designationFunction(0);
            passwordFunction(0);
            IDfunctions(7);
        }

        int email(int e) {
            while (e != 9) {
                switch(e) {
                    case 0: {
                        cout << "Enter the email: ";
                        cin >> fEmail;
                        return 9;
                        break;
                    }
                    case 1: {
                        cout << "Email: " << fEmail << endl;
                        return 9;
                        break;
                    }
                    case 3: {
                        cout << "--- Email Change Menu ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
        }    

        int phone(int p) {
            while(p != 9) {
                switch(p) {
                    case 0: {
                        cout << "Enter the phone number: ";
                        cin >> phone_number;
                        return 2;
                        break;
                    }
                    case 1: {
                        cout << "Phone number: " << phone_number << endl;
                        return 9;
                        break;
                    }
                    case 2: {
                        if (to_string(phone_number).length() != 10) {
                            cout << "Invalid phone number. ";
                            return 0;
                        } else {
                            return 9;
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Change Phone Number ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        p = 9;
                        break;
                }
            }
            return 9;
        }

        int dobFunction(int d) {
            while(d != 9) {
                switch(d) {
                    case 0: {
                        cout << "Enter the date of birth (day month year): ";
                        cin >> date_of_birth.day >> date_of_birth.month >> date_of_birth.year;
                        return 2; // Pass to validation
                        break;
                    }
                    case 1: {
                        cout << "Date of birth: " << date_of_birth.day << "/" << date_of_birth.month << "/" << date_of_birth.year << endl;
                        return 9;
                        break;
                    }
                    case 2: {
                        if (date_of_birth.day < 1 || date_of_birth.day > 31 || date_of_birth.month < 1 || date_of_birth.month > 12 || date_of_birth.year < 1900 || date_of_birth.year > 2026) {
                            cout << "Invalid date of birth. Please re-enter." << endl;
                            return 0;
                        } else {
                            return 9;
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Change Date of Birth ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
            return 9;
        }

        int departmentFunction(int df) {
            while (df != 9) {
                switch(df) {
                    case 0: {
                        cout << "Enter L to see list of departments or type the department name directly" << endl;
                        cout << "Enter the Department : ";
                        cin.ignore(); // Clears trailing spaces/newlines
                        getline(cin, department);
                        if (department == "L" || department == "l") {
                            return 4;
                        } else {
                            return 2; // Pass to verification
                        }
                        break;
                    }
                    case 1: {
                        cout << "Department: " << department << endl;
                        return 1;
                        break;
                    }
                    case 2: {
                        bool found = false;
                        for(int i = 0; i < number_of_departments; i++) {
                            if (department == departments[i]) {
                                found = true;
                                return 9;
                                break;
                            }
                        }
                        if (!found) {
                            cout << "Invalid department selected." << endl;
                            return 4; // Show options list
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Department Change Menu ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    case 4: {
                        cout << "\n~ Available Departments ~" << endl;
                        for (int i = 0; i < number_of_departments; i++) {
                            cout << i+1 << ". " << departments[i] << endl;
                        }
                        cout << endl;
                        return 0; // Ask user for input again
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
        }

        int designationFunction(int def) {
            while (def != 9) {
                switch(def) {
                    case 0: {
                        cout << "Enter Designation (Type full name or 'list'): ";
                        getline(cin, designation);
                        if (designation == "list") {
                            return 4;
                        } else {
                            return 2; // Pass to verification
                        }
                        break;
                    }
                    case 1: {
                        cout << "Designation: " << designation << endl;
                        return 9;
                        break;
                    }
                    case 2: {
                        bool found = false;
                        for(int i = 0; i < number_of_designations; i++) {
                            if (designation == designations[i]) {
                                found = true;
                                return 9;
                                break;
                            }
                        }
                        if (!found) {
                            cout << "Invalid designation selected." << endl;
                            return 4; // Show options list
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Designation Change Menu ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    case 4: {
                        cout << "\n~ Available Designations ~" << endl;
                        for (int i = 0; i < number_of_designations; i++) {
                            cout << i+1 << ". " << designations[i] << endl;
                        }
                        cout << endl;
                        return 0; // Ask user for input again
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
        }

        int passwordFunction(int pf) {
            while (pf != 9) {
                switch(pf) {
                    case 0: {
                        string pass1, pass2;
                        cout << "Enter Password: ";
                        cin >> pass1;
                        cout << "Confirm Password: ";
                        cin >> pass2;
                        if (pass1 == pass2) {
                            password = pass1;
                            return 9;
                        } else {
                            cout << "Passwords do not match. Please try again." << endl;
                            return 0;
                        }   
                        break;
                    }
                    case 2: {
                        int tries = 3;
                        while (tries > 0) {
                            cout << "Press Y to exit" << endl;
                            cout << "Enter your password: ";
                            string input;
                            cin >> input;
                            if (input == password) {
                                cout << "Password Verified." << endl;
                                return 9;
                            } else if (input == "Y" || input == "y") {
                                cout << "Exiting verification menu." << endl;
                                return 9;
                            } else {
                                cout << "INCORRECT PASSWORD" << endl;
                                tries--;
                                cout << "Tries remaining: " << tries << endl;
                            }
                        }
                        if (tries == 0) return 9;
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
            return 9;
        }

        int IDfunctions(int idf) {
            while(idf != 9) {
                switch(idf) {
                    case 1: {
                        cout << "ID: " << ID << endl;
                        return 9;
                    }
                    
                    case 7: {
                        int des = 0;
                        int dep = 0;
                        for (int i = 0; i < number_of_departments; i++) {
                            if (department == departments[i]) {
                                dep = i;
                                break;
                            }
                        }
                        for (int i = 0; i < number_of_designations; i++) {
                            if (designation == designations[i]) {
                                des = i;
                                break;
                            }
                        }
                        ID = dep * 1000 + des * 100 + date_of_birth.day;
                        cout << "Generated Registration ID: " << ID << endl;
                        idf = 9;
                        return 9;
                    }
                    default:
                        return 9;
                        break;
                }
            }
            return 9;
        }
};

int main() {
    string fname, lname;
    cout << "Enter first name: ";
    cin >> fname;
    cout << "Enter last name: ";
    cin >> lname;
    
    faculty f1(fname, lname);
    return 0;
}